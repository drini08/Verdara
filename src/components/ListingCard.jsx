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
      <div className="card edit-mode" style={{ border: '2px solid #28a745', padding: '15px', marginBottom: '10px', borderRadius: '8px', backgroundColor: '#fff' }}>
        <h4 style={{ marginTop: 0 }}>Edit Post</h4>
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} style={{ padding: '6px' }}>
            <option value="sell">Selling</option>
            <option value="buy">Buying</option>
          </select>
          <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Title" required style={{ padding: '6px' }} />
          <input value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})} placeholder="Quantity" style={{ padding: '6px' }} />
          <input value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} placeholder="Price" style={{ padding: '6px' }} />
          <input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Location" required style={{ padding: '6px' }} />
          <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Description" style={{ padding: '6px', minHeight: '60px' }} />
          <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '6px 12px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Changes</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`card ${listing.type}`} style={{ 
      border: '1px solid #ccc', 
      padding: '15px', 
      borderRadius: '8px', 
      backgroundColor: listing.type === 'sell' ? '#f0f8f0' : '#f0f4f8',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="badge" style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', marginBottom: '10px', color: 'white', fontSize: '0.85em', fontWeight: 'bold', backgroundColor: listing.type === 'sell' ? '#28a745' : '#007bff' }}>
          {listing.type === 'sell' ? '🌱 FOR SALE' : '🔍 LOOKING TO BUY'}
        </div>
        {isOwner && listing.status === 'active' && (
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setIsEditing(true)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}>✏️</button>
            <button onClick={handleDelete} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}>🗑️</button>
          </div>
        )}
      </div>
      
      <h3 style={{ marginTop: '10px', marginBottom: '8px' }}>{listing.title || 'Unlisted Item'}</h3>
      
      <p style={{ margin: '5px 0', color: '#555', fontSize: '0.9em' }}>
        <strong>Posted by:</strong> {listing.username || 'Unknown'} 
        {listing.location && <span> • <strong>Location:</strong> {listing.location}</span>}
      </p>

      {canInteract && listing.email && (
        <p style={{ margin: '5px 0', color: '#28a745', fontSize: '0.9em' }}>
          <strong>📧 Contact:</strong> <a href={`mailto:${listing.email}`} style={{ color: '#28a745', textDecoration: 'none', fontWeight: 'bold' }}>{listing.email}</a>
        </p>
      )}

      {listing.quantity && (
        <p style={{ margin: '5px 0', color: '#555', fontSize: '0.9em' }}>
          <strong>Quantity:</strong> {listing.quantity}
        </p>
      )}

      {listing.price && (
        <p style={{ margin: '5px 0', color: '#555', fontSize: '0.9em' }}>
          <strong>Price:</strong> {listing.price}
        </p>
      )}

      {listing.description && (
        <p style={{ margin: '10px 0', color: '#333', lineHeight: '1.5', fontSize: '0.95em', flexGrow: 1 }}>
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
          style={{ width: '100%', padding: '8px', marginTop: '10px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
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

      <div className="comments" style={{ background: '#f9f9f9', padding: '10px', marginTop: '15px', borderRadius: '6px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          <strong>
            {listing.type === 'buy' ? 'Offers & Comments:' : 'Comments:'}
          </strong>
          {comments.length > 0 && <span style={{ fontSize: '0.9em', color: '#666' }}> ({comments.length})</span>}
        </label>
        
        {comments.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0', maxHeight: '150px', overflowY: 'auto' }}>
            {comments.map((c, i) => (
              <li key={i} style={{ fontSize: '0.85em', padding: '8px', marginBottom: '5px', backgroundColor: 'white', borderRadius: '4px', borderLeft: '3px solid #ccc' }}>
                <strong>{c.username || 'Anonymous'}</strong>: {c.comment}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: '0.85em', color: '#999', margin: '0 0 10px 0' }}>
            No comments yet.
          </p>
        )}
        
        {canInteract && listing.status === 'active' ? (
          <div style={{ display: 'flex', gap: '5px' }}>
            <input 
              type="text" 
              value={commentText} 
              onChange={(e) => setCommentText(e.target.value)} 
              placeholder="Add a comment..."
              style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85em' }}
              disabled={isSubmitting}
            />
            <button 
              onClick={handleAddComment}
              disabled={isSubmitting || !commentText.trim()}
              style={{ padding: '6px 12px', cursor: isSubmitting ? 'not-allowed' : 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', opacity: isSubmitting ? 0.6 : 1, fontSize: '0.85em' }}
            >
              Post
            </button>
          </div>
        ) : listing.status === 'active' && (
          <p style={{ fontSize: '0.8em', color: '#666', padding: '6px', backgroundColor: '#fff3cd', borderRadius: '4px', margin: 0 }}>
            📝 Log in to comment.
          </p>
        )}
        {listing.status === 'completed' && (
          <p style={{ fontSize: '0.8em', color: '#666', padding: '6px', backgroundColor: '#e2e3e5', borderRadius: '4px', margin: 0, textAlign: 'center' }}>
            🔒 This deal is closed.
          </p>
        )}
      </div>
    </div>
  );
};

export default ListingCard;
