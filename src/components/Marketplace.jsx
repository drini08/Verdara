import React, { useState, useEffect, useMemo } from 'react';
import ListingCard from './ListingCard';
import CreatePostModal from './CreatePostModal';
import { useAuth } from '../context/AuthContext'; 

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
      const response = await fetch(`/api/marketplace/posts?status=${viewStatus}`);
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

      const response = await fetch('/api/marketplace/posts', {
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

      const response = await fetch(`/api/marketplace/posts/${postId}/comments`, {
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
    <div className="container marketplace-section" style={{ paddingTop: '20px' }}>
      <header style={{ marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em' }}>🌾 Agricultural Marketplace</h1>
            <p style={{ margin: 0, color: '#666' }}>
              {isLoggedIn ? `Welcome back, ${user?.username}!` : 'Direct trading between farmers and buyers'}
            </p>
          </div>
          {isLoggedIn && (
            <button 
              className="btn-primary" 
              onClick={() => setIsModalOpen(true)}
              style={{ padding: '12px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1em', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(40,167,69,0.2)' }}
            >
              + Create New Post
            </button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '25px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setFilterType('all')}
              style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #ccc', backgroundColor: filterType === 'all' ? '#333' : '#fff', color: filterType === 'all' ? '#fff' : '#333', cursor: 'pointer', fontWeight: 'bold' }}
            >
              All Posts
            </button>
            <button 
              onClick={() => setFilterType('sell')}
              style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #ccc', backgroundColor: filterType === 'sell' ? '#28a745' : '#fff', color: filterType === 'sell' ? '#fff' : '#28a745', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Selling
            </button>
            <button 
              onClick={() => setFilterType('buy')}
              style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #ccc', backgroundColor: filterType === 'buy' ? '#007bff' : '#fff', color: filterType === 'buy' ? '#fff' : '#007bff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Buying
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setViewStatus('active')}
              style={{ padding: '8px 16px', border: 'none', background: 'none', borderBottom: viewStatus === 'active' ? '2px solid #333' : 'none', cursor: 'pointer', color: viewStatus === 'active' ? '#333' : '#999', fontWeight: 'bold' }}
            >
              Active Deals
            </button>
            <button 
              onClick={() => setViewStatus('completed')}
              style={{ padding: '8px 16px', border: 'none', background: 'none', borderBottom: viewStatus === 'completed' ? '2px solid #333' : 'none', cursor: 'pointer', color: viewStatus === 'completed' ? '#333' : '#999', fontWeight: 'bold' }}
            >
              History
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', border: '1px solid #f5c6cb' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
          <p style={{ fontSize: '1.2em' }}>Loading marketplace listings...</p>
        </div>
      ) : (
        <div className="listings-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '25px' 
        }}>
          {filteredListings.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '2px dashed #ddd' }}>
              <p style={{ fontSize: '1.3em', color: '#666' }}>No listings found in this category.</p>
              {viewStatus === 'active' && <p style={{ color: '#999' }}>Why not create the first one?</p>}
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
