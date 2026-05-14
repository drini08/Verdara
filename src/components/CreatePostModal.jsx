import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const CreatePostModal = ({ onClose, onSubmit }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: 'sell',
    item: '',
    description: '',
    quantity: '',
    price: '',
    location: ''
  });

  useEffect(() => {
    // The form will be submitted with username from the backend
    // We just need location here
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.location.trim()) {
      alert('Please enter your location');
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="modal" style={{ position: 'fixed', top: '20%', left: '30%', background: 'white', padding: '20px', border: '2px solid black', zIndex: 1000, maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
      <h2>Create New Post</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label><strong>I want to:</strong></label>
        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{ padding: '8px' }}>
          <option value="sell">Sell Produce</option>
          <option value="buy">Request to Buy</option>
        </select>

        <input 
          placeholder="Item Name (e.g. Potatoes, Tomatoes)" 
          value={form.item}
          required 
          onChange={e => setForm({...form, item: e.target.value})}
          style={{ padding: '8px' }}
        />

        <input 
          placeholder="Quantity (e.g. 50 kg, 100 bunches)" 
          value={form.quantity}
          onChange={e => setForm({...form, quantity: e.target.value})}
          style={{ padding: '8px' }}
        />

        <input 
          placeholder={form.type === 'sell' ? "Price (e.g. $50/kg)" : "Budget/Price range"}
          value={form.price}
          onChange={e => setForm({...form, price: e.target.value})}
          style={{ padding: '8px' }}
        />

        <input 
          placeholder="Your Location (e.g. California, Sacramento)" 
          value={form.location}
          required 
          onChange={e => setForm({...form, location: e.target.value})}
          style={{ padding: '8px' }}
        />

        <textarea 
          placeholder={form.type === 'sell' ? "Details about your produce (quality, freshness, certifications, etc.)" : "Details about what you're looking for"}
          value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          style={{ padding: '8px', minHeight: '80px', fontFamily: 'inherit' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" style={{ background: 'green', color: 'white', padding: '8px 16px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}>Post</button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostModal;