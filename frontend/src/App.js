import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import Shadcn components
import { Button } from './components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/tabs';
import { Badge } from './components/badge';
import { Input } from './components/input';
import { Separator } from './components/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  MessageSquare, 
  BookOpen,
  Zap,
  Brain,
  Globe,
  ArrowRight,
  Search,
  Sparkles
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [cryptoData, setCryptoData] = useState([]);
  const [marketCommentary, setMarketCommentary] = useState('');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [analyses, setAnalyses] = useState({});
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  // Debug log to track selectedCrypto state
  useEffect(() => {
    console.log('Selected Crypto Changed:', selectedCrypto);
  }, [selectedCrypto]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [cryptoResponse, commentaryResponse, newsResponse] = await Promise.all([
        axios.get(`${API}/crypto/top`),
        axios.get(`${API}/market/commentary`),
        axios.get(`${API}/news`)
      ]);

      const topCryptos = cryptoResponse.data.slice(0, 10);
      setCryptoData(topCryptos);
      setMarketCommentary(commentaryResponse.data.commentary);
      setNews(newsResponse.data.slice(0, 6));

      // Auto-select Bitcoin if no crypto is selected
      if (!selectedCrypto && topCryptos.length > 0) {
        const bitcoin = topCryptos.find(crypto => crypto.id === 'bitcoin') || topCryptos[0];
        setSelectedCrypto(bitcoin);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalysis = async (cryptoId, analysisType) => {
    try {
      console.log('Generating analysis for:', cryptoId, analysisType);
      const response = await axios.post(`${API}/analysis/${cryptoId}?analysis_type=${analysisType}`);
      console.log('Analysis response:', response.data);
      setAnalyses(prev => ({
        ...prev,
        [`${cryptoId}_${analysisType}`]: response.data
      }));
    } catch (error) {
      console.error('Error generating analysis:', error);
    }
  };

  const queryAI = async () => {
    if (!aiQuery.trim()) return;
    
    setLoadingAI(true);
    try {
      const response = await axios.post(`${API}/ai/query`, {
        question: aiQuery,
        crypto_id: selectedCrypto?.id
      });
      setAiResponse(response.data.answer);
    } catch (error) {
      console.error('Error querying AI:', error);
      setAiResponse('Sorry, I cannot process your question right now.');
    } finally {
      setLoadingAI(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num?.toFixed(2) || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl font-medium">Loading SentientToken...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-emerald-400 flex items-center justify-center">
              <img src="/images/logo1.png" alt="Sentient Token" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Sentient Token
            </h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Button variant="ghost" className="text-slate-300 hover:text-emerald-400">Dashboard</Button>
            <Button variant="ghost" className="text-slate-300 hover:text-emerald-400">Analytics</Button>
            <Button variant="ghost" className="text-slate-300 hover:text-emerald-400">News</Button>
            <Button variant="ghost" className="text-slate-300 hover:text-emerald-400">Education</Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 pb-24 flex-grow">
        {/* Hero Section */}
        <div className="relative mb-8 w-full max-w-full mx-0 px-0">
          <div 
            className="rounded-2xl bg-cover bg-center h-[16rem] w-full flex items-center justify-center relative overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1639322537228-f710d846310a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxibG9ja2NoYWlufGVufDB8fHx8MTc1NzAxMDA5OHww&ixlib=rb-4.1.0&q=85')`
            }}
          >
            <div className="text-center text-white z-10 px-6 w-full">
              <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                AI-Powered Crypto Analysis
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Get intelligent insights, predictions, and real-time market commentary powered by advanced AI
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-emerald-600">Dashboard</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-600">Analytics</TabsTrigger>
            <TabsTrigger value="news" className="data-[state=active]:bg-emerald-600">News</TabsTrigger>
            <TabsTrigger value="education" className="data-[state=active]:bg-emerald-600">Education</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* AI Market Commentary */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-emerald-400">
                  <Brain className="h-5 w-5" />
                  <span>AI Market Commentary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-lg leading-relaxed">{marketCommentary}</p>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cryptoData.map((crypto, index) => (
                <Card 
                  key={crypto.id} 
                  className={`bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-all cursor-pointer ${
                    selectedCrypto?.id === crypto.id ? 'ring-2 ring-emerald-500' : ''
                  }`}
                  onClick={() => setSelectedCrypto(crypto)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img src={crypto.image} alt={crypto.name} className="w-8 h-8" />
                        <div>
                          <CardTitle className="text-white text-lg">{crypto.name}</CardTitle>
                          <CardDescription className="text-slate-400">
                            {crypto.symbol.toUpperCase()} • #{crypto.market_cap_rank}
                          </CardDescription>
                        </div>
                      </div>
                      {crypto.price_change_percentage_24h > 0 ? (
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">
                        {formatCurrency(crypto.current_price)}
                      </span>
                      <Badge 
                        variant={crypto.price_change_percentage_24h > 0 ? "default" : "destructive"}
                        className={crypto.price_change_percentage_24h > 0 ? "bg-emerald-600" : ""}
                      >
                        {crypto.price_change_percentage_24h > 0 ? '+' : ''}
                        {crypto.price_change_percentage_24h?.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-400">
                      <div>Volume: ${formatNumber(crypto.total_volume)}</div>
                      <div>Market Cap: ${formatNumber(crypto.market_cap)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {selectedCrypto ? (
              <div className="space-y-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3 text-white">
                      <img src={selectedCrypto.image} alt={selectedCrypto.name} className="w-8 h-8" />
                      <span>{selectedCrypto.name} Analysis</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['short_term', 'medium_term', 'long_term'].map((type) => {
                        const analysis = analyses[`${selectedCrypto.id}_${type}`];
                        return (
                          <Card key={type} className="bg-slate-700/50 border-slate-600">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm text-slate-300 capitalize">
                                {type.replace('_', ' ')} Forecast
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {analysis ? (
                                <div className="space-y-2">
                                  <Badge 
                                    variant={analysis.prediction === 'bullish' ? 'default' : 
                                           analysis.prediction === 'bearish' ? 'destructive' : 'secondary'}
                                    className={analysis.prediction === 'bullish' ? 'bg-emerald-600' : ''}
                                  >
                                    {analysis.prediction}
                                  </Badge>
                                  <div className="text-sm text-slate-400">
                                    Confidence: {analysis.confidence}%
                                  </div>
                                  <p className="text-sm text-slate-300">{analysis.explanation}</p>
                                </div>
                              ) : (
                                <Button 
                                  onClick={() => generateAnalysis(selectedCrypto.id, type)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                                  size="sm"
                                >
                                  Generate Analysis
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Query Section */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-emerald-400">
                      <MessageSquare className="h-5 w-5" />
                      <span>Ask AI About {selectedCrypto.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Ask anything about this cryptocurrency..."
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                        onKeyPress={(e) => e.key === 'Enter' && queryAI()}
                      />
                      <Button 
                        onClick={queryAI} 
                        disabled={loadingAI || !aiQuery.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {loadingAI ? (
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {aiResponse && (
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-slate-300">{aiResponse}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">Select a cryptocurrency from the dashboard to view detailed analytics</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {news.map((article, index) => (
                <Card key={index} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-all">
                  <CardHeader>
                    <CardTitle className="text-white text-lg leading-tight">{article.title}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {article.source} • {new Date(article.published_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300 mb-4">{article.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        {article.sentiment}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
                        Read More <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Market Cap",
                  description: "The total value of all coins in circulation, calculated by multiplying the current price by the total supply.",
                  icon: DollarSign
                },
                {
                  title: "Volatility",
                  description: "The degree of price fluctuation over time. Crypto markets are known for high volatility.",
                  icon: TrendingUp
                },
                {
                  title: "HODL",
                  description: "A strategy of holding onto cryptocurrency long-term, regardless of market fluctuations.",
                  icon: Zap
                },
                {
                  title: "DeFi",
                  description: "Decentralized Finance - financial services built on blockchain technology without traditional intermediaries.",
                  icon: Globe
                },
                {
                  title: "Staking",
                  description: "The process of participating in proof-of-stake consensus by locking up tokens to earn rewards.",
                  icon: BarChart3
                },
                {
                  title: "AI Analysis",
                  description: "Using artificial intelligence to analyze market trends, sentiment, and predict price movements.",
                  icon: Brain
                }
              ].map((term, index) => (
                <Card key={index} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-all">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-600/20 rounded-lg">
                        <term.icon className="h-5 w-5 text-emerald-400" />
                      </div>
                      <CardTitle className="text-emerald-400">{term.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300">{term.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-700/50 w-full py-4 fixed bottom-0 left-0 right-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-slate-400">
            <p>&copy; 2025 Sentient Token. AI-Powered Cryptocurrency Analysis Platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;