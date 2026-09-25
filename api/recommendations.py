import json
import requests
import os
import math
from urllib.parse import parse_qs
from datetime import datetime

# TMDB API configuration
TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
TMDB_BASE_URL = 'https://api.themoviedb.org/3'

def handler(request):
    """
    Vercel serverless function for personalized recommendations
    Enhanced to match localhost TypeScript recommendation engine accuracy
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
            'body': json.dumps({'error': 'Movie recommendations are temporarily unavailable'})
        }

    try:
        # Parse request body for POST requests
        if request['httpMethod'] == 'POST':
            body = json.loads(request['body']) if request.get('body') else {}
        else:
            # Parse query parameters for GET requests
            query_params = parse_qs(request.get('queryStringParameters', '') or '')
            body = {key: value[0] if value else None for key, value in query_params.items()}
        
        user_id = body.get('user_id', 'anonymous')
        preferences = body.get('preferences', {})
        content_type = body.get('type', 'mixed')
        
        # Enhanced recommendation logic matching TypeScript engine
        recommendation_categories = get_enhanced_recommendation_categories(user_id, preferences, content_type)
        
        total_count = sum(len(category['movies']) for category in recommendation_categories)
        
        response_data = {
            'recommendation_categories': recommendation_categories,
            'recommendation_count': total_count,
            'user_id': user_id,
            'type': content_type,
            'generated_at': datetime.now().isoformat(),
            'algorithm_version': 'enhanced_v2.0'
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
        print("Error in recommendations request")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            'body': json.dumps({
                'error': 'Failed to get recommendations',
                'message': 'Please try again later'
            })
        }

def get_enhanced_recommendation_categories(user_id, preferences, content_type):
    """
    Enhanced recommendation engine matching localhost TypeScript functionality
    """
    categories = []
    
    # 1. "Because you liked" recommendations (highest priority)
    liked_content = preferences.get('liked_content', [])
    if liked_content:
        for liked_item in liked_content[:3]:  # Top 3 liked items
            similar_content = get_content_based_similar(liked_item, preferences)
            if similar_content:
                categories.append({
                    'category': f"Because you liked {liked_item.get('title', 'this content')}",
                    'movies': similar_content[:10]
                })
    
    # 2. "Because you watched" recommendations
    watched_content = preferences.get('watched_content', [])
    if watched_content:
        recent_watched = sorted(watched_content, 
                              key=lambda x: x.get('watchedAt', ''), 
                              reverse=True)[:2]
        
        for watched_item in recent_watched:
            similar_content = get_collaborative_similar(watched_item, preferences)
            if similar_content:
                categories.append({
                    'category': f"Because you watched {watched_item.get('title', 'this content')}",
                    'movies': similar_content[:10]
                })
    
    # 3. Content-based recommendations by genre preferences
    if preferences.get('favoriteGenres'):
        for genre_id in preferences['favoriteGenres'][:2]:  # Top 2 genres
            genre_name = get_genre_name(genre_id)
            genre_content = get_genre_based_recommendations(genre_id, preferences, content_type)
            if genre_content:
                categories.append({
                    'category': f"Popular {genre_name}",
                    'movies': genre_content[:10]
                })
    
    # 4. Trending recommendations
    if content_type == 'movies' or content_type == 'mixed':
        trending_movies = get_trending_recommendations('movie', preferences)
        if trending_movies:
            categories.append({
                'category': 'Trending Movies',
                'movies': trending_movies[:10]
            })
    
    if content_type == 'tv' or content_type == 'mixed':
        trending_tv = get_trending_recommendations('tv', preferences)
        if trending_tv:
            categories.append({
                'category': 'Trending TV Shows',
                'movies': trending_tv[:10]  # Using 'movies' for compatibility
            })
    
    # 5. Top rated recommendations based on preferences
    top_rated = get_top_rated_recommendations(preferences, content_type)
    if top_rated:
        categories.append({
            'category': 'Top Picks for You',
            'movies': top_rated[:10]
        })
    
    # 6. Fallback to popular content if no categories
    if not categories:
        popular_content = get_popular_fallback(content_type, preferences)
        categories.append({
            'category': 'Recommended for You',
            'movies': popular_content[:10]
        })
    
    return categories

def get_content_based_similar(source_content, preferences):
    """
    Enhanced content-based similarity matching TypeScript engine
    """
    try:
        content_id = source_content.get('id')
        media_type = source_content.get('media_type', 'movie')
        
        if not content_id:
            return []
        
        # Get similar content from TMDB
        url = f"{TMDB_BASE_URL}/{media_type}/{content_id}/similar"
        params = {'api_key': TMDB_API_KEY, 'page': 1}
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            similar_items = response.json().get('results', [])
            
            # Enhanced filtering based on user preferences
            filtered_items = apply_preference_filters(similar_items, preferences)
            
            # Score and sort by relevance
            scored_items = []
            for item in filtered_items:
                score = calculate_similarity_score(item, source_content, preferences)
                scored_items.append((item, score))
            
            # Sort by score and format
            scored_items.sort(key=lambda x: x[1], reverse=True)
            
            recommendations = []
            for item, score in scored_items[:15]:
                recommendations.append({
                    'id': item['id'],
                    'title': item.get('title') or item.get('name', ''),
                    'overview': item.get('overview', ''),
                    'poster_path': item.get('poster_path'),
                    'backdrop_path': item.get('backdrop_path'),
                    'release_date': item.get('release_date') or item.get('first_air_date', ''),
                    'vote_average': item.get('vote_average', 0),
                    'vote_count': item.get('vote_count', 0),
                    'genre_ids': item.get('genre_ids', []),
                    'media_type': media_type,
                    'reason': f"Because you liked {source_content.get('title', 'similar content')}",
                    'similarity_score': score
                })
            
            return recommendations
    
    except Exception:
        print("Error in content-based similarity")
        return []

def get_collaborative_similar(watched_content, preferences):
    """
    Collaborative filtering simulation for serverless environment
    """
    try:
        content_id = watched_content.get('id')
        media_type = watched_content.get('media_type', 'movie')
        
        if not content_id:
            return []
        
        # Get recommendations based on what users who liked this also liked
        url = f"{TMDB_BASE_URL}/{media_type}/{content_id}/recommendations"
        params = {'api_key': TMDB_API_KEY, 'page': 1}
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            recommended_items = response.json().get('results', [])
            
            # Apply preference filters
            filtered_items = apply_preference_filters(recommended_items, preferences)
            
            # Score based on collaborative signals
            scored_items = []
            for item in filtered_items:
                score = calculate_collaborative_score(item, watched_content, preferences)
                scored_items.append((item, score))
            
            # Sort by collaborative score
            scored_items.sort(key=lambda x: x[1], reverse=True)
            
            recommendations = []
            for item, score in scored_items[:15]:
                recommendations.append({
                    'id': item['id'],
                    'title': item.get('title') or item.get('name', ''),
                    'overview': item.get('overview', ''),
                    'poster_path': item.get('poster_path'),
                    'backdrop_path': item.get('backdrop_path'),
                    'release_date': item.get('release_date') or item.get('first_air_date', ''),
                    'vote_average': item.get('vote_average', 0),
                    'vote_count': item.get('vote_count', 0),
                    'genre_ids': item.get('genre_ids', []),
                    'media_type': media_type,
                    'reason': f"Because you watched {watched_content.get('title', 'similar content')}",
                    'collaborative_score': score
                })
            
            return recommendations
    
    except Exception:
        print("Error in collaborative filtering")
        return []

def calculate_similarity_score(item, source_content, preferences):
    """
    Calculate content similarity score matching TypeScript engine logic
    """
    score = 0.0
    
    # Genre similarity (primary factor)
    item_genres = set(item.get('genre_ids', []))
    source_genres = set(source_content.get('genre_ids', []))
    
    if item_genres and source_genres:
        genre_overlap = len(item_genres.intersection(source_genres))
        total_genres = len(item_genres.union(source_genres))
        if total_genres > 0:
            score += (genre_overlap / total_genres) * 0.4
    
    # User preference alignment
    user_genres = set(preferences.get('favoriteGenres', []))
    if user_genres and item_genres:
        pref_overlap = len(item_genres.intersection(user_genres))
        score += (pref_overlap / len(user_genres)) * 0.3
    
    # Quality score (vote average)
    vote_avg = item.get('vote_average', 0)
    if vote_avg >= 8.0:
        score += 0.2
    elif vote_avg >= 7.0:
        score += 0.1
    elif vote_avg < 5.0:
        score -= 0.1
    
    # Popularity factor
    vote_count = item.get('vote_count', 0)
    if vote_count > 1000:
        score += 0.1
    elif vote_count < 50:
        score -= 0.1
    
    # Release date relevance
    min_rating = preferences.get('minRating', 0)
    if min_rating and vote_avg < min_rating:
        score -= 0.2
    
    return max(0.0, score)

def calculate_collaborative_score(item, watched_content, preferences):
    """
    Calculate collaborative filtering score
    """
    score = 0.0
    
    # Base score from TMDB recommendation strength
    vote_avg = item.get('vote_average', 0)
    vote_count = item.get('vote_count', 0)
    
    # Weighted rating (accounts for both rating and popularity)
    if vote_count > 0:
        weighted_rating = (vote_avg * vote_count) / (vote_count + 250)  # Bayesian average
        score += (weighted_rating / 10) * 0.5
    
    # Genre preference alignment
    item_genres = set(item.get('genre_ids', []))
    user_genres = set(preferences.get('favoriteGenres', []))
    
    if user_genres and item_genres:
        pref_overlap = len(item_genres.intersection(user_genres))
        score += (pref_overlap / len(user_genres)) * 0.3
    
    # Recency factor for trending content
    release_date = item.get('release_date') or item.get('first_air_date', '')
    if release_date:
        try:
            release_year = int(release_date.split('-')[0])
            current_year = datetime.now().year
            if current_year - release_year <= 2:
                score += 0.2  # Boost for recent content
        except:
            pass
    
    return score
        
def get_movie_recommendations(preferences, recommendation_type='popular'):
    """Get movie recommendations based on user preferences"""
    recommendations = []
    
    try:
        # Choose endpoint based on recommendation type
        if recommendation_type == 'trending':
            url = f"{TMDB_BASE_URL}/trending/movie/week"
        elif recommendation_type == 'top_rated':
            url = f"{TMDB_BASE_URL}/movie/top_rated"
        else:  # popular (default)
            url = f"{TMDB_BASE_URL}/movie/popular"
        
        params = {'api_key': TMDB_API_KEY, 'page': 1}
        
        # Use discover endpoint for more advanced filtering
        if preferences.get('favoriteGenres') or preferences.get('preferredLanguage') or preferences.get('minRating'):
            url = f"{TMDB_BASE_URL}/discover/movie"
            if recommendation_type == 'top_rated':
                params['sort_by'] = 'vote_average.desc'
                params['vote_count.gte'] = 1000
            elif recommendation_type == 'trending':
                params['sort_by'] = 'popularity.desc'
            else:
                params['sort_by'] = 'popularity.desc'
        
        # Add genre filter if provided
        if preferences.get('favoriteGenres'):
            genre_ids = ','.join(map(str, preferences['favoriteGenres']))
            params['with_genres'] = genre_ids
        
        # Add language filter if provided
        if preferences.get('preferredLanguage'):
            params['with_original_language'] = preferences['preferredLanguage']
        
        # Add minimum rating filter
        if preferences.get('minRating'):
            params['vote_average.gte'] = preferences['minRating']
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            movies = response.json().get('results', [])
            
            for movie in movies[:15]:
                recommendations.append({
                    'id': movie['id'],
                    'title': movie['title'],
                    'overview': movie.get('overview', ''),
                    'poster_path': movie.get('poster_path'),
                    'backdrop_path': movie.get('backdrop_path'),
                    'release_date': movie.get('release_date', ''),
                    'vote_average': movie.get('vote_average', 0),
                    'vote_count': movie.get('vote_count', 0),
                    'genre_ids': movie.get('genre_ids', []),
                    'media_type': 'movie',
                    'reason': get_recommendation_reason(movie, preferences, recommendation_type)
                })
    
    except Exception:
        print("Error fetching movie recommendations")
    
    return recommendations

def get_tv_recommendations(preferences, recommendation_type='popular'):
    """Get TV show recommendations based on user preferences"""
    recommendations = []
    
    try:
        # Choose endpoint based on recommendation type
        if recommendation_type == 'trending':
            url = f"{TMDB_BASE_URL}/trending/tv/week"
        elif recommendation_type == 'top_rated':
            url = f"{TMDB_BASE_URL}/tv/top_rated"
        else:  # popular (default)
            url = f"{TMDB_BASE_URL}/tv/popular"
        
        params = {'api_key': TMDB_API_KEY, 'page': 1}
        
        # Use discover endpoint for more advanced filtering
        if preferences.get('favoriteGenres') or preferences.get('preferredLanguage') or preferences.get('minRating'):
            url = f"{TMDB_BASE_URL}/discover/tv"
            if recommendation_type == 'top_rated':
                params['sort_by'] = 'vote_average.desc'
                params['vote_count.gte'] = 50
            elif recommendation_type == 'trending':
                params['sort_by'] = 'popularity.desc'
            else:
                params['sort_by'] = 'popularity.desc'
        
        # Add genre filter if provided
        if preferences.get('favoriteGenres'):
            genre_ids = ','.join(map(str, preferences['favoriteGenres']))
            params['with_genres'] = genre_ids
        
        # Add language filter if provided
        if preferences.get('preferredLanguage'):
            params['with_original_language'] = preferences['preferredLanguage']
        
        # Add minimum rating filter
        if preferences.get('minRating'):
            params['vote_average.gte'] = preferences['minRating']
        
        # Add language filter if provided
        if preferences.get('preferredLanguage'):
            params['with_original_language'] = preferences['preferredLanguage']
        
        # Add minimum rating filter
        if preferences.get('minRating'):
            params['vote_average.gte'] = preferences['minRating']
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            shows = response.json().get('results', [])
            
            for show in shows[:15]:
                recommendations.append({
                    'id': show['id'],
                    'title': show.get('name', show.get('title', '')),
                    'name': show.get('name', ''),
                    'overview': show.get('overview', ''),
                    'poster_path': show.get('poster_path'),
                    'backdrop_path': show.get('backdrop_path'),
                    'first_air_date': show.get('first_air_date', ''),
                    'vote_average': show.get('vote_average', 0),
                    'vote_count': show.get('vote_count', 0),
                    'genre_ids': show.get('genre_ids', []),
                    'media_type': 'tv',
                    'reason': get_recommendation_reason(show, preferences, recommendation_type)
                })
    
    except Exception:
        print("Error fetching TV recommendations")
    
    return recommendations

def get_recommendation_reason(content, preferences, recommendation_type='popular'):
    """Generate a Netflix-style reason for the recommendation"""
    
    # First check recommendation type for specific reasons
    if recommendation_type == 'trending':
        return "Trending now"
    elif recommendation_type == 'top_rated':
        return "Critically acclaimed"
    
    # Check if user has watched/liked similar content
    watched_content = preferences.get('watched_content', [])
    liked_content = preferences.get('liked_content', [])
    
    # Generate "Because you liked..." messages
    if liked_content:
        # Find similar content based on genres
        content_genres = set(content.get('genre_ids', []))
        for liked_item in liked_content:
            liked_genres = set(liked_item.get('genre_ids', []))
            if content_genres.intersection(liked_genres):
                return f"Because you liked {liked_item.get('title', 'similar content')}"
    
    # Generate "Because you watched..." messages
    if watched_content:
        content_genres = set(content.get('genre_ids', []))
        for watched_item in watched_content:
            watched_genres = set(watched_item.get('genre_ids', []))
            if content_genres.intersection(watched_genres):
                return f"Because you watched {watched_item.get('title', 'similar content')}"
    
    # Fallback to genre-based recommendations
    if preferences.get('favoriteGenres'):
        content_genres = set(content.get('genre_ids', []))
        favorite_genres = set(preferences['favoriteGenres'])
        if content_genres.intersection(favorite_genres):
            genre_names = get_genre_names(list(content_genres.intersection(favorite_genres)))
            if genre_names:
                return f"Popular in {genre_names[0]}"
    
    # Rating-based recommendations
    if content.get('vote_average', 0) >= 8.0:
        return "Critically acclaimed"
    elif content.get('vote_average', 0) >= 7.5:
        return "Highly rated"
    
    # Popularity-based recommendations
    if content.get('vote_count', 0) >= 2000:
        return "Trending now"
    elif content.get('vote_count', 0) >= 1000:
        return "Popular choice"
    
    # Year-based recommendations
    release_year = content.get('release_date', '').split('-')[0] if content.get('release_date') else None
    if release_year and int(release_year) >= 2023:
        return "New release"
    
    return "Recommended for you"

def get_genre_names(genre_ids):
    """Convert genre IDs to genre names"""
    genre_map = {
        28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
        99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
        27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
        10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
        10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
        10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
    }
    return [genre_map.get(genre_id, "Unknown") for genre_id in genre_ids if genre_id in genre_map]

def interleave_recommendations(movies, tv_shows):
    """Interleave movie and TV show recommendations"""
    result = []
    max_length = max(len(movies), len(tv_shows))
    
    for i in range(max_length):
        if i < len(movies):
            result.append(movies[i])
        if i < len(tv_shows):
            result.append(tv_shows[i])
    
    return result

def get_similar_to_liked_content(preferences):
    """Get content similar to user's liked content"""
    recommendations = []
    liked_content = preferences.get('liked_content', [])
    
    if not liked_content:
        return recommendations
    
    try:
        # Get similar content for the first liked item
        first_liked = liked_content[0]
        content_id = first_liked.get('id')
        media_type = first_liked.get('media_type', 'movie')
        
        if content_id:
            url = f"{TMDB_BASE_URL}/{media_type}/{content_id}/similar"
            params = {'api_key': TMDB_API_KEY, 'page': 1}
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                similar_items = response.json().get('results', [])
                
                for item in similar_items[:10]:
                    recommendations.append({
                        'id': item['id'],
                        'title': item.get('title') or item.get('name', ''),
                        'overview': item.get('overview', ''),
                        'poster_path': item.get('poster_path'),
                        'backdrop_path': item.get('backdrop_path'),
                        'release_date': item.get('release_date') or item.get('first_air_date', ''),
                        'vote_average': item.get('vote_average', 0),
                        'vote_count': item.get('vote_count', 0),
                        'genre_ids': item.get('genre_ids', []),
                        'media_type': media_type,
                        'reason': f"Because you liked {first_liked.get('title', 'similar content')}"
                    })
    
    except Exception:
        print("Error fetching similar content")
    
    return recommendations
def apply_preference_filters(items, preferences):
    """
    Apply user preference filters to content list
    """
    filtered_items = []
    
    min_rating = preferences.get('minRating', 0)
    max_rating = preferences.get('maxRating', 10)
    preferred_language = preferences.get('preferredLanguage')
    disliked_genres = set(preferences.get('dislikedGenres', []))
    year_from = preferences.get('year_from')
    year_to = preferences.get('year_to')
    
    for item in items:
        # Rating filter
        vote_avg = item.get('vote_average', 0)
        if vote_avg < min_rating or vote_avg > max_rating:
            continue
        
        # Language filter
        if preferred_language and item.get('original_language') != preferred_language:
            continue
        
        # Genre filter (avoid disliked genres)
        item_genres = set(item.get('genre_ids', []))
        if disliked_genres and item_genres.intersection(disliked_genres):
            continue
        
        # Year filter
        release_date = item.get('release_date') or item.get('first_air_date', '')
        if release_date and (year_from or year_to):
            try:
                release_year = int(release_date.split('-')[0])
                if year_from and release_year < year_from:
                    continue
                if year_to and release_year > year_to:
                    continue
            except:
                pass
        
        filtered_items.append(item)
    
    return filtered_items

def get_trending_recommendations(media_type, preferences):
    """
    Get trending content with preference filtering
    """
    try:
        url = f"{TMDB_BASE_URL}/trending/{media_type}/week"
        params = {'api_key': TMDB_API_KEY, 'page': 1}
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            trending_items = response.json().get('results', [])
            
            # Apply preference filters
            filtered_items = apply_preference_filters(trending_items, preferences)
            
            recommendations = []
            for item in filtered_items[:15]:
                recommendations.append({
                    'id': item['id'],
                    'title': item.get('title') or item.get('name', ''),
                    'overview': item.get('overview', ''),
                    'poster_path': item.get('poster_path'),
                    'backdrop_path': item.get('backdrop_path'),
                    'release_date': item.get('release_date') or item.get('first_air_date', ''),
                    'vote_average': item.get('vote_average', 0),
                    'vote_count': item.get('vote_count', 0),
                    'genre_ids': item.get('genre_ids', []),
                    'media_type': media_type,
                    'reason': 'Trending now'
                })
            
            return recommendations
    
    except Exception:
        print("Error fetching trending recommendations")
        return []

def get_top_rated_recommendations(preferences, content_type):
    """
    Get top rated content based on user preferences
    """
    try:
        recommendations = []
        
        if content_type in ['movies', 'mixed']:
            # Get top rated movies
            url = f"{TMDB_BASE_URL}/movie/top_rated"
            params = {'api_key': TMDB_API_KEY, 'page': 1}
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                movies = response.json().get('results', [])
                filtered_movies = apply_preference_filters(movies, preferences)
                
                for movie in filtered_movies[:8]:
                    recommendations.append({
                        'id': movie['id'],
                        'title': movie['title'],
                        'overview': movie.get('overview', ''),
                        'poster_path': movie.get('poster_path'),
                        'backdrop_path': movie.get('backdrop_path'),
                        'release_date': movie.get('release_date', ''),
                        'vote_average': movie.get('vote_average', 0),
                        'vote_count': movie.get('vote_count', 0),
                        'genre_ids': movie.get('genre_ids', []),
                        'media_type': 'movie',
                        'reason': 'Critically acclaimed'
                    })
        
        if content_type in ['tv', 'mixed']:
            # Get top rated TV shows
            url = f"{TMDB_BASE_URL}/tv/top_rated"
            params = {'api_key': TMDB_API_KEY, 'page': 1}
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                shows = response.json().get('results', [])
                filtered_shows = apply_preference_filters(shows, preferences)
                
                for show in filtered_shows[:7]:
                    recommendations.append({
                        'id': show['id'],
                        'title': show.get('name', ''),
                        'overview': show.get('overview', ''),
                        'poster_path': show.get('poster_path'),
                        'backdrop_path': show.get('backdrop_path'),
                        'release_date': show.get('first_air_date', ''),
                        'vote_average': show.get('vote_average', 0),
                        'vote_count': show.get('vote_count', 0),
                        'genre_ids': show.get('genre_ids', []),
                        'media_type': 'tv',
                        'reason': 'Critically acclaimed'
                    })
        
        return recommendations
    
    except Exception:
        print("Error fetching top rated recommendations")
        return []

def get_genre_based_recommendations(genre_id, preferences, content_type):
    """
    Get recommendations for a specific genre
    """
    try:
        recommendations = []
        
        # Discover content by genre
        media_types = ['movie'] if content_type == 'movies' else ['tv'] if content_type == 'tv' else ['movie', 'tv']
        
        for media_type in media_types:
            url = f"{TMDB_BASE_URL}/discover/{media_type}"
            params = {
                'api_key': TMDB_API_KEY,
                'with_genres': str(genre_id),
                'sort_by': 'vote_average.desc',
                'vote_count.gte': 100,
                'page': 1
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                items = response.json().get('results', [])
                filtered_items = apply_preference_filters(items, preferences)
                
                for item in filtered_items[:8]:
                    recommendations.append({
                        'id': item['id'],
                        'title': item.get('title') or item.get('name', ''),
                        'overview': item.get('overview', ''),
                        'poster_path': item.get('poster_path'),
                        'backdrop_path': item.get('backdrop_path'),
                        'release_date': item.get('release_date') or item.get('first_air_date', ''),
                        'vote_average': item.get('vote_average', 0),
                        'vote_count': item.get('vote_count', 0),
                        'genre_ids': item.get('genre_ids', []),
                        'media_type': media_type,
                        'reason': f'Popular in {get_genre_name(genre_id)}'
                    })
        
        return recommendations
    
    except Exception:
        print("Error fetching genre recommendations")
        return []

def get_genre_name(genre_id):
    """
    Convert genre ID to genre name
    """
    genre_map = {
        28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
        99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
        27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
        10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
        10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
        10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
    }
    return genre_map.get(genre_id, "Unknown")

def get_popular_fallback(content_type, preferences):
    """
    Fallback to popular content when no other recommendations available
    """
    try:
        recommendations = []
        
        if content_type in ['movies', 'mixed']:
            url = f"{TMDB_BASE_URL}/movie/popular"
            params = {'api_key': TMDB_API_KEY, 'page': 1}
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                movies = response.json().get('results', [])
                filtered_movies = apply_preference_filters(movies, preferences)
                
                for movie in filtered_movies[:10]:
                    recommendations.append({
                        'id': movie['id'],
                        'title': movie['title'],
                        'overview': movie.get('overview', ''),
                        'poster_path': movie.get('poster_path'),
                        'backdrop_path': movie.get('backdrop_path'),
                        'release_date': movie.get('release_date', ''),
                        'vote_average': movie.get('vote_average', 0),
                        'vote_count': movie.get('vote_count', 0),
                        'genre_ids': movie.get('genre_ids', []),
                        'media_type': 'movie',
                        'reason': 'Popular recommendation'
                    })
        
        return recommendations
    
    except Exception:
        print("Error fetching popular fallback")
        return []
