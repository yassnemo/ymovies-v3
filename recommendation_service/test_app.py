import importlib.util
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch


SERVICE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVICE_DIR))
FAKE_TOKEN = 'unit-test-service-token'
with patch.dict(os.environ, {
    'TMDB_API_KEY': 'unit-test-tmdb-key',
    'RECOMMENDATION_SERVICE_TOKEN': FAKE_TOKEN,
}, clear=True):
    import app as service


class RecommendationServiceTests(unittest.TestCase):
    def setUp(self):
        service.app.config['TESTING'] = True
        self.client = service.app.test_client()
        self.headers = {'Authorization': f'Bearer {FAKE_TOKEN}'}
        with service._CACHE_LOCK:
            service._CACHE.clear()
            service._CACHE_BYTES = 0
        self.network = patch.object(service.requests, 'get', side_effect=AssertionError('Network is mocked'))
        self.network_mock = self.network.start()
        self.addCleanup(self.network.stop)

    def test_health_is_public_and_responses_are_private(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'healthy')
        self.assertEqual(response.headers['Cache-Control'], 'private, no-store')
        self.assertNotIn('Access-Control-Allow-Origin', response.headers)
        self.network_mock.assert_not_called()

    def test_all_recommendation_routes_require_bearer_token(self):
        routes = [
            ('GET', '/api/reco/v2/movie/1'),
            ('GET', '/api/reco/v2/tv/1'),
            ('POST', '/recommendations/personalized'),
            ('POST', '/api/reco/v2/hybrid/movie/1'),
        ]
        for method, route in routes:
            for token in ('', 'Bearer wrong', 'Basic unit-test-service-token'):
                with self.subTest(route=route, token=bool(token)):
                    response = self.client.open(route, method=method,
                        headers={'Authorization': token}, json={})
                    self.assertEqual(response.status_code, 401)
        self.network_mock.assert_not_called()

    def test_invalid_json_payloads_are_rejected_before_network(self):
        payloads = [
            [], {'watched_ids': '1'}, {'watched_ids': [True]},
            {'watched_ids': [0]}, {'watched_ids': [service.MAX_ID + 1]},
            {'watched_ids': ['1?api_key=attacker']},
            {'watched_ids': list(range(1, 22))},
            {'rated_movies': [{}] * 101}, {'rated_movies': [{'id': 1, 'rating': 6}]},
            {'rated_movies': [{'id': 1, 'rating': True}]},
            {'rated_movies': [{'id': 1, 'rating': float('nan')}]},
            {'rated_movies': [{'id': 1, 'rating': 4, 'genre_ids': [False]}]},
            {'liked_genres': list(range(1, 52))}, {'userId': 'not-needed'},
        ]
        for route in ('/recommendations/personalized', '/api/reco/v2/hybrid/movie/1'):
            for payload in payloads:
                with self.subTest(route=route, payload_type=type(payload).__name__):
                    response = self.client.post(route, headers=self.headers,
                        data=json.dumps(payload), content_type='application/json')
                    self.assertEqual(response.status_code, 400)
                    self.assertEqual(response.json['error'], 'Invalid recommendation data')
        self.network_mock.assert_not_called()

    def test_body_limit_content_type_and_malformed_json(self):
        route = '/recommendations/personalized'
        response = self.client.post(route, headers=self.headers,
            data='x' * (64 * 1024 + 1), content_type='application/json')
        self.assertEqual(response.status_code, 413)
        response = self.client.post(route, headers=self.headers, data='{}', content_type='text/plain')
        self.assertEqual(response.status_code, 415)
        response = self.client.post(route, headers=self.headers, data='{', content_type='application/json')
        self.assertEqual(response.status_code, 400)
        response = self.client.post(route, headers=self.headers,
            data='[' * 2000, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.network_mock.assert_not_called()

    def test_route_ids_are_bounded(self):
        for route in ('movie', 'tv'):
            for media_id in (0, service.MAX_ID + 1):
                response = self.client.get(f'/api/reco/v2/{route}/{media_id}', headers=self.headers)
                self.assertEqual(response.status_code, 400)
        self.network_mock.assert_not_called()

    def test_valid_personalization_passes_ratings_and_genres_to_engine(self):
        details = {'id': 1, 'genres': [{'id': 28}], 'release_date': '2020-01-01'}
        candidate = {'id': 2, 'title': 'Candidate'}
        with patch.object(service, 'get_movie_details', return_value=details), \
             patch.object(service, 'get_movie_similar', return_value=[candidate]), \
             patch.object(service, 'get_movie_recommendations', return_value=[]), \
             patch.object(service, 'tmdb_get', return_value={'results': []}), \
             patch.object(service, 'build_user_profile', return_value={}) as profile, \
             patch.object(service, 'hybrid_recommend', return_value=[candidate]) as recommend:
            response = self.client.post('/recommendations/personalized', headers=self.headers, json={
                'watched_ids': [1, 1], 'rated_movies': [{'id': 1, 'rating': 4}], 'liked_genres': [28],
            })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['recommendation_count'], 1)
        self.assertEqual(profile.call_args.args[1], [{'id': 1, 'rating': 4, 'genre_ids': [28]}])
        self.assertEqual(profile.call_args.args[2], [28])
        self.assertEqual(recommend.call_args.kwargs['already_seen_ids'], {1})

    def test_movie_and_tv_recommendations_keep_working(self):
        for media in ('movie', 'tv'):
            with self.subTest(media=media):
                source = {'id': 1, 'genre_ids': [28], 'vote_count': 1000, 'vote_average': 8}
                candidate = dict(source, id=2, title='Candidate', popularity=100)
                def upstream(path, _params=None):
                    return {'results': [candidate]} if path.endswith(('/similar', '/recommendations')) else source
                with patch.object(service, 'tmdb_get', side_effect=upstream):
                    response = self.client.get(f'/api/reco/v2/{media}/1', headers=self.headers)
                self.assertEqual(response.status_code, 200)
                self.assertEqual([item['id'] for item in response.json], [2])

    def test_failures_do_not_log_request_credentials_or_cache_results(self):
        private_message = 'private-key private-history https://example.invalid/?api_key=private-key'
        self.network_mock.side_effect = service.requests.RequestException(private_message)
        with self.assertLogs(service.app.logger, level='WARNING') as logs:
            response = self.client.get('/api/reco/v2/movie/1', headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('private-key', '\n'.join(logs.output))
        self.assertNotIn('private-history', '\n'.join(logs.output))
        self.assertIn('operation=movie type=upstream', '\n'.join(logs.output))
        self.assertFalse(service._CACHE)

    def test_tmdb_redirects_and_non_success_are_not_cached(self):
        for status in (302, 401, 429, 500):
            self.network_mock.side_effect = None
            self.network_mock.return_value = Mock(status_code=status)
            with self.assertRaises(service.UpstreamError):
                service.tmdb_get('/movie/1')
            self.assertFalse(self.network_mock.call_args.kwargs['allow_redirects'])
            self.assertFalse(service._CACHE)

    def test_tmdb_success_is_cached(self):
        self.network_mock.side_effect = None
        self.network_mock.return_value = Mock(status_code=200, json=Mock(return_value={'id': 1}))
        self.assertEqual(service.tmdb_get('/movie/1'), {'id': 1})
        self.assertEqual(service.tmdb_get('/movie/1'), {'id': 1})
        self.assertEqual(self.network_mock.call_count, 1)

    def test_cache_has_lru_ttl_and_byte_bounds(self):
        with patch.object(service, '_CACHE_MAX_ENTRIES', 2), \
             patch.object(service, '_CACHE_MAX_BYTES', 100), \
             patch.object(service, '_CACHE_ITEM_MAX_BYTES', 60), \
             patch.object(service.time, 'monotonic', return_value=100):
            service._cache_set('a', 'A')
            service._cache_set('b', 'B')
            self.assertEqual(service._cache_get('a'), 'A')
            service._cache_set('c', 'C')
            self.assertIsNone(service._cache_get('b'))
            service._cache_set('too-big', 'x' * 100)
            self.assertNotIn('too-big', service._CACHE)
            service._cache_set('d', 'd' * 55)
            service._cache_set('e', 'e' * 55)
            self.assertLessEqual(service._CACHE_BYTES, 100)
        with patch.object(service.time, 'monotonic', return_value=200):
            service._cache_set('fresh', {'id': 1})
            self.assertEqual(list(service._CACHE), ['fresh'])
        with patch.object(service.time, 'monotonic', return_value=300):
            self.assertIsNone(service._cache_get('fresh'))
            self.assertEqual(service._CACHE_BYTES, 0)

    def test_startup_requires_service_token(self):
        with patch.dict(os.environ, {'TMDB_API_KEY': 'unit-test-key', 'RECOMMENDATION_SERVICE_TOKEN': ''}, clear=True):
            spec = importlib.util.spec_from_file_location('missing_token_app', SERVICE_DIR / 'app.py')
            module = importlib.util.module_from_spec(spec)
            with self.assertRaisesRegex(RuntimeError, '^RECOMMENDATION_SERVICE_TOKEN environment variable is required$'):
                spec.loader.exec_module(module)


if __name__ == '__main__':
    unittest.main()
