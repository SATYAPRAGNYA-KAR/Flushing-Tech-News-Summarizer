import React, { useState } from 'react';

const NewsAggregator = () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(yesterday);
  const [endDate, setEndDate] = useState(today);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const NEWS_API_KEY = '5a5141ff363140368f832b8455c674cc'; // Replace this

  const speakSummary = (text) => {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
  };

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    setArticles([]);

    try {
      const url = `https://newsapi.org/v2/everything?q=technology&from=${startDate}&to=${endDate}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${NEWS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'ok') {
        throw new Error(data.message || 'Failed to fetch news');
      }

      if (!data.articles || data.articles.length === 0) {
        setError('No articles found for this date range.');
        setLoading(false);
        return;
      }

      const summarized = [];
      
      for (const article of data.articles) {
        try {
          const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1000,
              messages: [{
                role: 'user',
                content: `Summarize this news article in 2-3 sentences:\n\nTitle: ${article.title}\n\nContent: ${article.description || article.content || 'No content'}`
              }]
            })
          });

          const claudeData = await claudeResponse.json();
          const summary = claudeData.content?.[0]?.text || article.description || 'No summary available';

          summarized.push({
            ...article,
            aiSummary: summary
          });
        } catch (err) {
          console.error('Summary error:', err);
          summarized.push({
            ...article,
            aiSummary: article.description || 'Summary unavailable'
          });
        }
      }

      setArticles(summarized);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', color: 'white', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            🗞️ AI News Digest
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.9 }}>Powered by NewsAPI</p>
        </div>

        {/* Controls */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', color: 'white', fontWeight: 'bold', marginBottom: '8px' }}>
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', color: 'white', fontWeight: 'bold', marginBottom: '8px' }}>
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={fetchNews}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: loading ? '#999' : 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
              >
                {loading ? '⏳ Loading...' : '✨ Get News'}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid #ef4444',
            color: 'white',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '20px'
          }}>
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {/* Articles */}
        {articles.map((article, i) => (
          <div key={i} style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '20px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {article.urlToImage && (
                <img
                  src={article.urlToImage}
                  alt=""
                  style={{
                    width: '250px',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '15px',
                    flexShrink: 0
                  }}
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
                  {article.title}
                </h3>
                
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontSize: '14px', color: 'rgba(255,255,255,0.8)', flexWrap: 'wrap' }}>
                  <span>🕒 {new Date(article.publishedAt).toLocaleString()}</span>
                  {article.source?.name && (
                    <span style={{
                      background: 'rgba(255, 107, 157, 0.4)',
                      padding: '4px 12px',
                      borderRadius: '15px'
                    }}>
                      {article.source.name}
                    </span>
                  )}
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.2) 0%, rgba(196, 69, 105, 0.2) 100%)',
                  border: '2px solid rgba(255, 107, 157, 0.4)',
                  borderRadius: '15px',
                  padding: '20px',
                  marginBottom: '15px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ color: '#ff6b9d', fontWeight: 'bold', fontSize: '14px' }}>
                      ✨ AI SUMMARY
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => speakSummary(article.aiSummary)}
                        style={{
                          background: 'rgba(255, 107, 157, 0.4)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: 'white',
                          fontSize: '18px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 157, 0.6)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255, 107, 157, 0.4)'}
                        title="Read aloud"
                      >
                        🔊
                      </button>
                      <button
                        onClick={stopSpeaking}
                        style={{
                          background: 'rgba(239, 68, 68, 0.4)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: 'white',
                          fontSize: '18px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.6)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.4)'}
                        title="Stop"
                      >
                        ⏹️
                      </button>
                    </div>
                  </div>
                  <p style={{ color: 'white', lineHeight: '1.6', fontSize: '16px', margin: 0 }}>
                    {article.aiSummary}
                  </p>
                </div>

                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#ff6b9d',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  Read Full Article →
                </a>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {!loading && !error && articles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'white' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📰</div>
            <p style={{ fontSize: '20px' }}>Click "Get News" to fetch articles</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsAggregator;