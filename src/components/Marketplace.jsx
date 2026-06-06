import React, { useState, useEffect, useMemo } from 'react';
import ListingCard from './ListingCard';
import CreatePostModal from './CreatePostModal';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../config/api'; 

const Marketplace = () => {
  const { isLoggedIn, user, token } = useAuth();
  const [listings, setListings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, sell, buy
  const [viewStatus, setViewStatus] = useState('active'); // active, completed

  // Load posts from the database
  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(apiUrl(`/api/marketplace/posts?status=${viewStatus}`));
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      setListings(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError('Failed to load marketplace posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [viewStatus]);

  const filteredListings = useMemo(() => {
    if (filterType === 'all') return listings;
    return listings.filter(l => l.type === filterType);
  }, [listings, filterType]);

  const handleAddListing = async (newListing) => {
    try {
      if (!token) {
        alert('You must be logged in to post.');
        return;
      }

      const response = await fetch(apiUrl('/api/marketplace/posts'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: newListing.type,
          title: newListing.item,
          description: newListing.description,
          quantity: newListing.quantity,
          price: newListing.price,
          location: newListing.location,
          category: 'produce'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      alert('Post created successfully!');
      fetchPosts();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating post:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleAddComment = async (postId, text) => {
    try {
      if (!token) {
        alert('You must be logged in to comment.');
        return;
      }

      const response = await fetch(apiUrl(`/api/marketplace/posts/${postId}/comments`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment: text }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      fetchPosts();
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to post comment. Please try again.');
    }
  };

  return (
    <div className="container marketplace-section">
      <header className="marketplace-header">
        <div className="marketplace-title-row">
          <div>
            <h1>🌾 Agricultural Marketplace</h1>
            <p className="marketplace-subtitle">
              {isLoggedIn ? `Welcome back, ${user?.username}!` : 'Direct trading between farmers and buyers'}
            </p>
          </div>
          {isLoggedIn && (
            <button 
              className="btn btn-primary" 
              onClick={() => setIsModalOpen(true)}
            >
              + Create New Post
            </button>
          )}
        </div>

        <div className="marketplace-controls">
          <div className="filter-btn-group">
            <button 
              onClick={() => setFilterType('all')}
              className={`filter-btn ${filterType === 'all' ? 'active-all' : ''}`}
            >
              All Posts
            </button>
            <button 
              onClick={() => setFilterType('sell')}
              className={`filter-btn ${filterType === 'sell' ? 'active-sell' : ''}`}
            >
              Selling
            </button>
            <button 
              onClick={() => setFilterType('buy')}
              className={`filter-btn ${filterType === 'buy' ? 'active-buy' : ''}`}
            >
              Buying
            </button>
          </div>

          <div className="status-tab-group">
            <button 
              onClick={() => setViewStatus('active')}
              className={`status-tab ${viewStatus === 'active' ? 'active' : ''}`}
            >
              Active Deals
            </button>
            <button 
              onClick={() => setViewStatus('completed')}
              className={`status-tab ${viewStatus === 'completed' ? 'active' : ''}`}
            >
              History
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="marketplace-card-error" style={{ marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--fg-muted)' }}>
          <p style={{ fontSize: '1.2em' }}>Loading marketplace listings...</p>
        </div>
      ) : (
        <div className="listing-grid">
          {filteredListings.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: '1.3em', color: 'var(--fg-muted)' }}>No listings found in this category.</p>
              {viewStatus === 'active' && <p style={{ color: 'var(--fg-muted)', opacity: 0.8 }}>Why not create the first one?</p>}
            </div>
          ) : (
            filteredListings.map(listing => (
              <ListingCard 
                key={listing.id} 
                listing={{
                  ...listing,
                  comments: listing.comments || []
                }} 
                canInteract={isLoggedIn}
                onAddComment={handleAddComment}
                onRefresh={fetchPosts}
              />
            ))
          )}
        </div>
      )}

      {isModalOpen && (
        <CreatePostModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleAddListing} 
        />
      )}
    </div>
  );
};

export default Marketplace;