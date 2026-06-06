import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../config/api';

const ListingCard = ({ listing, canInteract, onAddComment, onRefresh }) => {
  const { user, token } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDealDone, setConfirmDealDone] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [dealMessage, setDealMessage] = useState('');
  const [dealError, setDealError] = useState('');
  const [editForm, setEditForm] = useState({
    title: listing.title,
    description: listing.description,
    quantity: listing.quantity,
    price: listing.price,
    location: listing.location,
    type: listing.type
  });

  const isOwner = user && user.id === listing.userId;
  const comments = listing.comments || [];

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(listing.id, commentText);
      setCommentText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const response = await fetch(apiUrl(`/api/marketplace/posts/${listing.id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        onRefresh();
      } else {
        alert('Failed to delete post');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    setDealError('');
    try {
      const response = await fetch(apiUrl(`/api/marketplace/posts/${listing.id}/complete`), {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setDealMessage('Deal marked as done. Moving it to history...');
        setConfirmDealDone(false);
        onRefresh();
      } else {
        setDealError('Failed to complete post');
      }
    } catch (err) {
      console.error('Complete error:', err);
      setDealError('Failed to complete post. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(apiUrl(`/api/marketplace/posts/${listing.id}`), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...editForm, category: listing.category || 'produce' })
      });
      if (response.ok) {
        setIsEditing(false);
        onRefresh();
      } else {
        alert('Failed to update post');
      }
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  if (isEditing) {
    return (
      <div className="listing-card edit-mode" style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Edit Post</h3>
        <form onSubmit={handleUpdate} className="edit-mode-form">
          <label>
            Listing Type
            <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}>
              <option value="sell">Selling</option>
              <option value="buy">Buying</option>
            </select>
          </label>
          <label>
            Title
            <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Title" required />
          </label>
          <label>
            Quantity
            <input value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})} placeholder="Quantity e.g., 500 kg" />
          </label>
          <label>
            Price
            <input value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} placeholder="Price e.g., $2.50/kg" />
          </label>
          <label>
            Location
            <input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Location" required />
          </label>
          <label>
            Description
            <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Describe your produce, availability, details..." />
          </label>
          <div className="edit-mode-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`listing-card ${listing.type}`}>
      {/* Card Image Container */}
      <div className="listing-card-image-box">
        {listing.imageUrl ? (
          <img 
            src={listing.imageUrl} 
            alt={listing.title || 'Marketplace Item'} 
            loading="lazy" 
          />
        ) : (
          <div className="listing-card-image-placeholder">
            <span style={{ fontSize: '2.5rem' }}>{listing.type === 'sell' ? '🌱' : '🔍'}</span>
            <span>No image available</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="listing-card-content">
        <div className="listing-card-header">
          <div className={`listing-card-badge ${listing.type}`}>
            {listing.type === 'sell' ? '🌱 FOR SALE' : '🔍 WANTED'}
          </div>
          {isOwner && listing.status === 'active' && (
            <div className="listing-card-actions-top">
              <button onClick={() => setIsEditing(true)} title="Edit" className="icon-btn">✏️</button>
              <button onClick={handleDelete} title="Delete" className="icon-btn">🗑️</button>
            </div>
          )}
        </div>

        <h3 className="listing-card-title">{listing.title || 'Unlisted Item'}</h3>
        
        <div className="listing-card-meta">
          <span>👤 {listing.username || 'Unknown'}</span>
          {listing.location && <span>📍 {listing.location}</span>}
        </div>

        {canInteract && listing.email && (
          <div style={{ fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '12px' }}>
            <strong>📧 Contact:</strong>{' '}
            <a href={`mailto:${listing.email}`} style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 'bold' }}>
              {listing.email}
            </a>
          </div>
        )}

        <div className="listing-card-info-grid">
          <div className="info-item">
            <span className="info-label">Quantity</span>
            <span className="info-value">{listing.quantity || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Price</span>
            <span className="info-value">{listing.price || 'Contact for Price'}</span>
          </div>
        </div>

        {listing.description && (
          <p className="listing-card-description">
            {listing.description}
          </p>
        )}

        {isOwner && listing.status === 'active' && (
          <button 
            onClick={() => {
              setConfirmDealDone(true);
              setDealMessage('');
              setDealError('');
            }}
            className="btn btn-ghost"
            style={{ width: '100%', marginBottom: '16px', justifyContent: 'center', borderColor: '#6f42c1', color: '#6f42c1' }}
          >
            ✅ Deal Done
          </button>
        )}

        {confirmDealDone && (
          <div className="marketplace-confirm-panel">
            <strong>Mark this deal as done?</strong>
            <p>It will move from active deals into your history.</p>
            <div>
              <button type="button" onClick={handleComplete} disabled={isCompleting}>
                {isCompleting ? 'Saving...' : 'Confirm'}
              </button>
              <button type="button" onClick={() => setConfirmDealDone(false)} disabled={isCompleting}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {dealMessage && <p className="marketplace-card-status">{dealMessage}</p>}
        {dealError && <p className="marketplace-card-error">{dealError}</p>}

        {/* Comments Section */}
        <div className="listing-comments-section">
          <h4 className="comments-title">
            <span>{listing.type === 'buy' ? 'Offers & Comments' : 'Comments'}</span>
            {comments.length > 0 && <span style={{ color: 'var(--fg-muted)', fontWeight: 'normal' }}>({comments.length})</span>}
          </h4>
          
          {comments.length > 0 ? (
            <div className="comments-list">
              {comments.map((c, i) => (
                <div key={i} className="comment-bubble">
                  <strong className="comment-author">{c.username || 'Anonymous'}</strong>
                  {c.comment}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', margin: '0 0 12px 0' }}>
              No comments yet.
            </p>
          )}
          
          {canInteract && listing.status === 'active' ? (
            <div className="comment-input-row">
              <input 
                type="text" 
                value={commentText} 
                onChange={(e) => setCommentText(e.target.value)} 
                placeholder="Add a comment..."
                disabled={isSubmitting}
              />
              <button 
                onClick={handleAddComment}
                disabled={isSubmitting || !commentText.trim()}
                className="btn btn-primary"
              >
                Post
              </button>
            </div>
          ) : listing.status === 'active' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', margin: 0, background: 'var(--accent-soft)', padding: '6px 10px', borderRadius: '6px' }}>
              📝 Log in to comment.
            </p>
          )}
          {listing.status === 'completed' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', textAlign: 'center', margin: 0, padding: '6px 10px', background: 'var(--bg)', borderRadius: '6px' }}>
              🔒 This deal is closed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
