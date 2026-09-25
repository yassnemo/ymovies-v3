import json
import requests
import os
from urllib.parse import parse_qs

# TMDB API configuration
TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
TMDB_BASE_URL = 'https://api.themoviedb.org/3'

def handler(request):
    """
    Vercel serverless function for similar content recommendations
    """
    # Handle CORS
    if request['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': ''
        }
    
    if not TMDB_API_KEY:
        return {
            'statusCode': 503,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Movie data is temporarily unavailable'})
        }

    try:
        # Parse query parameters
        query_params = request.get('queryStringParameters', {}) or {}
        content_id = query_params.get('id') or query_params.get('content_id')
        media_type = query_params.get('type', 'movie')
        
        if not content_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                'body': json.dumps({
                    'error': 'Content ID is required',
                    'message': 'Please provide id or content_id parameter'
                })
            }
        
        # Get similar content
        similar_content = get_similar_content(content_id, media_type)
        recommended_content = get_recommended_content(content_id, media_type)
        
        # Combine and deduplicate
        all_content = similar_content + recommended_content
        seen_ids = set()
        unique_content = []
        
        for item in all_content:
            if item['id'] not in seen_ids and str(item['id']) != str(content_id):
                seen_ids.add(item['id'])
                unique_content.append(item)
        
        response_data = {
            'similar': unique_content[:20],
            'content_id': content_id,
            'media_type': media_type,
            'total': len(unique_content)
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            'body': json.dumps(response_data)
        }
        
    except Exception:
        print("Error in similar content request")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            'body': json.dumps({
                'error': 'Failed to get similar content',
                'message': 'Please try again later'
            })
        }

def get_similar_content(content_id, media_type):
    """Get similar content from TMDB"""
    try:
        url = f"{TMDB_BASE_URL}/{media_type}/{content_id}/similar"
        params = {'api_key': TMDB_API_KEY, 'page': 1}
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            results = response.json().get('results', [])
            return format_content_results(results, media_type, "Similar content")
        
    except Exception:
        print("Error fetching similar content")
    
    return []

def get_recommended_content(content_id, media_type):
    """Get recommended content from TMDB"""
    try:
        url = f"{TMDB_BASE_URL}/{media_type}/{content_id}/recommendations"
        params = {'api_key': TMDB_API_KEY, 'page': 1}
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            results = response.json().get('results', [])
            return format_content_results(results, media_type, "Recommended for you")
        
    except Exception:
        print("Error fetching recommended content")
    
    return []

def format_content_results(results, media_type, reason):
    """Format content results for consistent output"""
    formatted = []
    
    for item in results[:10]:
        if media_type == 'movie':
            formatted_item = {
                'id': item['id'],
                'title': item.get('title', ''),
                'overview': item.get('overview', ''),
                'poster_path': item.get('poster_path'),
                'backdrop_path': item.get('backdrop_path'),
                'release_date': item.get('release_date', ''),
                'vote_average': item.get('vote_average', 0),
                'vote_count': item.get('vote_count', 0),
                'genre_ids': item.get('genre_ids', []),
                'media_type': 'movie',
                'reason': reason
            }
        else:  # TV show
            formatted_item = {
                'id': item['id'],
                'title': item.get('name', item.get('title', '')),
                'name': item.get('name', ''),
                'overview': item.get('overview', ''),
                'poster_path': item.get('poster_path'),
                'backdrop_path': item.get('backdrop_path'),
                'first_air_date': item.get('first_air_date', ''),
                'vote_average': item.get('vote_average', 0),
                'vote_count': item.get('vote_count', 0),
                'genre_ids': item.get('genre_ids', []),
                'media_type': 'tv',
                'reason': reason
            }
        
        formatted.append(formatted_item)
    
    return formatted
