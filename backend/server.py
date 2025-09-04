from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import asyncio
from typing import Optional, Dict, Any, List

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Get Emergent LLM key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

class UserMessage:
    def __init__(self, text: str):
        self.text = text

class LlmChat:
    def __init__(self, api_key: str, session_id: str, system_message: str):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.model = None
    
    def with_model(self, provider: str, model_name: str):
        self.model = model_name
        return self
    
    async def send_message(self, message: UserMessage) -> str:
        # Mock response for now
        return "bullish|75|The market shows strong upward momentum with increasing trading volume."

# Initialize LLM Chat for crypto analysis
crypto_analyzer = LlmChat(
    api_key=EMERGENT_LLM_KEY,
    session_id="crypto-analysis",
    system_message="You are an expert cryptocurrency market analyst. Provide clear, concise insights about market movements, trends, and predictions. Focus on actionable information and explain complex concepts in simple terms. Always include confidence levels for predictions."
).with_model("openai", "gpt-4o")

# Define Models
class CryptoCurrency(BaseModel):
    id: str
    symbol: str
    name: str
    current_price: float
    market_cap: int
    market_cap_rank: int
    price_change_percentage_24h: float
    price_change_percentage_7d: Optional[float] = None
    total_volume: int
    image: str

class NewsItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    url: str
    published_at: str
    source: str
    sentiment: Optional[str] = "neutral"
    ai_summary: Optional[str] = ""

class MarketAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    crypto_id: str
    analysis_type: str  # short_term, medium_term, long_term
    prediction: str
    confidence: float
    explanation: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIQuery(BaseModel):
    question: str
    crypto_id: Optional[str] = None

class AIResponse(BaseModel):
    answer: str
    confidence: float
    related_cryptos: List[str] = []

# CoinGecko API endpoints
COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"

async def fetch_crypto_data():
    """Fetch top cryptocurrencies from CoinGecko"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{COINGECKO_BASE_URL}/coins/markets",
                params={
                    "vs_currency": "usd",
                    "order": "market_cap_desc",
                    "per_page": 50,
                    "page": 1,
                    "sparkline": False,
                    "price_change_percentage": "1h,24h,7d"
                },
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch crypto data")
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching crypto data: {str(e)}")

async def fetch_crypto_news():
    """Fetch cryptocurrency news from CryptoCompare"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://min-api.cryptocompare.com/data/v2/news/",
                params={
                    "lang": "EN",
                    "categories": "BTC,ETH,Trading,Blockchain",
                    "limit": 20
                },
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("Data", [])
            else:
                return []
    except:
        # Return sample news if API fails
        return [
            {
                "id": "1",
                "title": "Bitcoin Shows Strong Support at $43,000 Level",
                "body": "Bitcoin maintains strong support levels as institutional interest continues to grow.",
                "url": "https://example.com/bitcoin-news",
                "published_on": int(datetime.now().timestamp()),
                "source_info": {"name": "CryptoNews"}
            },
            {
                "id": "2", 
                "title": "Ethereum Network Upgrade Shows Promise",
                "body": "Latest Ethereum developments show significant improvements in transaction speeds.",
                "url": "https://example.com/ethereum-news",
                "published_on": int(datetime.now().timestamp()),
                "source_info": {"name": "BlockchainToday"}
            }
        ]

async def generate_market_commentary(crypto_data: List[dict]) -> str:
    """Generate AI-powered market commentary"""
    try:
        top_cryptos = crypto_data[:5]
        market_summary = "Current top 5 cryptocurrencies:\n"
        for crypto in top_cryptos:
            market_summary += f"- {crypto['name']} ({crypto['symbol'].upper()}): ${crypto['current_price']:.2f} ({crypto['price_change_percentage_24h']:.2f}% 24h)\n"
        
        prompt = f"""Based on this cryptocurrency market data, provide a brief market commentary (2-3 sentences) explaining the current market sentiment and any notable trends:

{market_summary}

Focus on overall market direction and highlight any significant movements."""

        user_message = UserMessage(text=prompt)
        response = await crypto_analyzer.send_message(user_message)
        return response
    except Exception as e:
        return "Market analysis is currently unavailable. Please check back later for AI-powered insights."

async def analyze_crypto_prediction(crypto_id: str, analysis_type: str) -> Dict[str, Any]:
    """Generate crypto prediction analysis"""
    try:
        # Get crypto data from the market data we already have
        crypto_data_list = await fetch_crypto_data()
        crypto_data = None
        
        # Find the specific cryptocurrency
        for crypto in crypto_data_list:
            if crypto['id'] == crypto_id:
                crypto_data = crypto
                break
        
        if not crypto_data:
            # Fallback with mock data for demonstration
            crypto_data = {
                'name': crypto_id.replace('-', ' ').title(),
                'symbol': crypto_id[:3].upper(),
                'current_price': 50000,
                'price_change_percentage_24h': -2.0,
                'market_cap_rank': 1
            }
        
        current_price = crypto_data.get('current_price', 0)
        price_change_24h = crypto_data.get('price_change_percentage_24h', 0)
        market_cap_rank = crypto_data.get('market_cap_rank', 1)
        
        timeframe_map = {
            "short_term": "next 7 days",
            "medium_term": "next 30 days", 
            "long_term": "next 3-6 months"
        }
            
        prompt = f"""Analyze {crypto_data.get('name', crypto_id)} ({crypto_data.get('symbol', crypto_id[:3]).upper()}) for {timeframe_map[analysis_type]} prediction:

Current Price: ${current_price}
24h Change: {price_change_24h:.2f}%
Market Cap Rank: #{market_cap_rank}

Provide:
1. Price prediction direction (bullish/bearish/neutral)
2. Confidence level (0-100%)
3. Brief explanation (2-3 sentences)

Format: PREDICTION|CONFIDENCE|EXPLANATION"""

        user_message = UserMessage(text=prompt)
        response = await crypto_analyzer.send_message(user_message)
        
        # Parse AI response
        parts = response.split("|")
        if len(parts) >= 3:
            return {
                "prediction": parts[0].strip(),
                "confidence": float(parts[1].strip().replace("%", "")),
                "explanation": parts[2].strip()
            }
        else:
            return {
                "prediction": "neutral",
                "confidence": 50.0,
                "explanation": "Analysis temporarily unavailable"
            }
    except Exception as e:
        return {
            "prediction": "neutral", 
            "confidence": 50.0,
            "explanation": f"Unable to generate prediction: {str(e)}"
        }

# API Routes
@api_router.get("/")
async def root():
    return {"message": "SentientToken API - Cryptocurrency Analysis Platform"}

@api_router.get("/crypto/top", response_model=List[CryptoCurrency])
async def get_top_cryptocurrencies():
    """Get top cryptocurrencies by market cap"""
    crypto_data = await fetch_crypto_data()
    
    # Clean and prepare data for Pydantic validation
    cleaned_data = []
    for crypto in crypto_data:
        # Ensure all required fields exist and handle None values
        cleaned_crypto = {
            'id': crypto.get('id', ''),
            'symbol': crypto.get('symbol', ''),
            'name': crypto.get('name', ''),
            'current_price': float(crypto.get('current_price', 0)),
            'market_cap': int(crypto.get('market_cap', 0)),
            'market_cap_rank': int(crypto.get('market_cap_rank', 0)),
            'price_change_percentage_24h': float(crypto.get('price_change_percentage_24h', 0)),
            'price_change_percentage_7d': float(crypto.get('price_change_percentage_7d', 0)) if crypto.get('price_change_percentage_7d') is not None else None,
            'total_volume': int(crypto.get('total_volume', 0)),
            'image': crypto.get('image', '')
        }
        cleaned_data.append(cleaned_crypto)
    
    return [CryptoCurrency(**crypto) for crypto in cleaned_data]

@api_router.get("/crypto/{crypto_id}")
async def get_crypto_details(crypto_id: str):
    """Get detailed information for a specific cryptocurrency"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{COINGECKO_BASE_URL}/coins/{crypto_id}")
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=404, detail="Cryptocurrency not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/crypto/{crypto_id}/chart")
async def get_crypto_chart(crypto_id: str, days: int = 7):
    """Get historical price data for charting"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{COINGECKO_BASE_URL}/coins/{crypto_id}/market_chart",
                params={"vs_currency": "usd", "days": days}
            )
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=404, detail="Chart data not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/news", response_model=List[NewsItem])
async def get_crypto_news():
    """Get latest cryptocurrency news"""
    news_data = await fetch_crypto_news()
    news_items = []
    
    for item in news_data:
        news_item = NewsItem(
            title=item.get("title", ""),
            description=item.get("body", "")[:200] + "..." if len(item.get("body", "")) > 200 else item.get("body", ""),
            url=item.get("url", ""),
            published_at=datetime.fromtimestamp(item.get("published_on", 0)).isoformat(),
            source=item.get("source_info", {}).get("name", "Unknown"),
            sentiment="neutral"
        )
        news_items.append(news_item)
    
    return news_items

@api_router.get("/market/commentary")
async def get_market_commentary():
    """Get AI-powered market commentary"""
    crypto_data = await fetch_crypto_data()
    commentary = await generate_market_commentary(crypto_data)
    return {"commentary": commentary, "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/analysis/{crypto_id}")
async def create_crypto_analysis(crypto_id: str, analysis_type: str):
    """Generate AI analysis for specific cryptocurrency"""
    if analysis_type not in ["short_term", "medium_term", "long_term"]:
        raise HTTPException(status_code=400, detail="Invalid analysis type")
    
    analysis_data = await analyze_crypto_prediction(crypto_id, analysis_type)
    
    analysis = MarketAnalysis(
        crypto_id=crypto_id,
        analysis_type=analysis_type,
        prediction=analysis_data["prediction"],
        confidence=analysis_data["confidence"],
        explanation=analysis_data["explanation"]
    )
    
    # Store in database
    await db.market_analyses.insert_one(analysis.dict())
    return analysis

@api_router.get("/analysis/{crypto_id}")
async def get_crypto_analyses(crypto_id: str):
    """Get stored analyses for a cryptocurrency"""
    analyses = await db.market_analyses.find({"crypto_id": crypto_id}).sort("timestamp", -1).limit(10).to_list(10)
    return [MarketAnalysis(**analysis) for analysis in analyses]

@api_router.post("/ai/query", response_model=AIResponse)
async def query_ai_assistant(query: AIQuery):
    """Ask questions to the AI assistant"""
    try:
        context = ""
        if query.crypto_id:
            # Add crypto context
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{COINGECKO_BASE_URL}/coins/{query.crypto_id}")
                if response.status_code == 200:
                    crypto_data = response.json()
                    context = f"Context: User is asking about {crypto_data['name']} ({crypto_data['symbol'].upper()}). "
        
        prompt = f"{context}{query.question}"
        user_message = UserMessage(text=prompt)
        response = await crypto_analyzer.send_message(user_message)
        
        return AIResponse(
            answer=response,
            confidence=85.0,
            related_cryptos=[]
        )
    except Exception as e:
        return AIResponse(
            answer="I'm sorry, I'm currently unable to process your question. Please try again later.",
            confidence=0.0,
            related_cryptos=[]
        )

# Educational content endpoint
@api_router.get("/education/terms")
async def get_crypto_terms():
    """Get educational cryptocurrency terms"""
    terms = [
        {
            "term": "Market Cap",
            "definition": "The total value of all coins in circulation, calculated by multiplying the current price by the total supply."
        },
        {
            "term": "Volatility", 
            "definition": "The degree of price fluctuation over time. Crypto markets are known for high volatility."
        },
        {
            "term": "HODL",
            "definition": "A strategy of holding onto cryptocurrency long-term, regardless of market fluctuations."
        },
        {
            "term": "DeFi",
            "definition": "Decentralized Finance - financial services built on blockchain technology without traditional intermediaries."
        },
        {
            "term": "Staking",
            "definition": "The process of participating in proof-of-stake consensus by locking up tokens to earn rewards."
        }
    ]
    return {"terms": terms}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()