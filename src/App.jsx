import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  ShoppingBag,
  Coffee,
  Flame,
  Star,
  Check,
  Plus,
  Minus,
  X,
  ShieldCheck,
  Truck,
  Award,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  Package,
  Menu
} from 'lucide-react';
import './App.css';

const PRODUCT_PRICE_OVERRIDES = {
  'coffee-01': { price: 800, weight: 'kg' },
  'pepper-01': { price: 1200, weight: 'kg' }
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'checkout', 'success'
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', city: '', pincode: '', upiId: '' });
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Authentication States
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState(null);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('Error fetching products:', error);
      } else {
        const mapped = data.map(p => ({
            ...p,
            ...(PRODUCT_PRICE_OVERRIDES[p.id] || {}),
            image: p.image_url,
            reviewsCount: p.reviews_count,
            flavorNotes: p.flavor_notes
        }));
        setProducts(mapped);
      }
    }
    fetchProducts();

    // Retrieve active session & set listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setFormData(prev => ({ ...prev, email: session.user.email || prev.email }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setFormData(prev => ({ ...prev, email: session.user.email || prev.email }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMessage(null);

    if (authMode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setIsAuthOpen(false);
        showToast('Welcome back to Kodagu Coffee!');
        setAuthPassword('');
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthSuccessMessage(`📧 Verification link sent to ${authEmail}! Please check your email and click the confirmation link to complete registration.`);
        setAuthPassword('');
      }
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    showToast('Signed out successfully');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openCart = () => {
    setCheckoutStep('cart');
    setIsCartOpen(true);
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
    showToast(`Added ${product.name} to your cart`);
    openCart();
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = cartSubtotal > 999 ? 0 : 75;
  const cartTotal = cartSubtotal + (cart.length > 0 ? shippingFee : 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();

    const orderId = 'TR-' + Math.floor(100000 + Math.random() * 900000);

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      user_id: user ? user.id : null,
      customer_name: formData.name,
      customer_email: formData.email,
      customer_phone: formData.phone,
      address: formData.address,
      city: formData.city,
      pincode: formData.pincode,
      upi_id: formData.upiId,
      subtotal: cartSubtotal,
      shipping_fee: shippingFee,
      total: cartTotal,
      status: 'pending_payment'
    });

    if (orderError) {
      showToast('Error placing order. Please try again.');
      return;
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      cart.map(item => ({
        order_id: orderId,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    );

    if (itemsError) {
      showToast('Error saving order items.');
      return;
    }

    setOrderSuccess({
      id: orderId,
      items: [...cart],
      total: cartTotal,
      name: formData.name,
      city: formData.city
    });
    setCart([]);
    setCheckoutStep('success');
  };


  return (
    <div className="store-app">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <Sparkles size={16} /> {toastMessage}
        </div>
      )}

      {/* Top Banner */}
      <div className="top-strip">
        <div className="container strip-content">
          <span>🌿 100% Direct Estate Origin from Western Ghats</span>
          <span className="contact-strip-desktop">📞 Contact: Vidwan NA (+91 9019818197)</span>
          <span>⚡ Free Express Delivery across India on orders above ₹999</span>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="site-header">
        <div className="container header-inner">
          <div className="brand-logo">
            <div className="logo-icons">
              <Coffee size={22} className="coffee-icon" />
              <Flame size={22} className="pepper-icon" />
            </div>
            <div className="logo-text">
              <h1>KODAGU COFFEE</h1>
              <p>Artisanal Indian Coffee & Spices</p>
            </div>
          </div>

          <nav className="desktop-nav">
            <a href="#products" onClick={() => setIsMobileMenuOpen(false)}>Collection</a>
            <a href="#story" onClick={() => setIsMobileMenuOpen(false)}>Our Estates</a>
            <a href="#pairing" onClick={() => setIsMobileMenuOpen(false)}>Chef’s Secret</a>
            <a href="#reviews" onClick={() => setIsMobileMenuOpen(false)}>Reviews</a>
          </nav>

          <div className="header-actions">
            {user ? (
              <div className="user-profile-badge" title={user.email}>
                <span className="user-avatar-initial">{user.email ? user.email[0].toUpperCase() : 'U'}</span>
                <button className="signout-btn" onClick={handleSignOut} title="Sign Out">
                  Sign Out
                </button>
              </div>
            ) : (
              <button className="signin-nav-btn" onClick={() => { setIsAuthOpen(true); setAuthMode('signin'); setAuthError(null); setAuthSuccessMessage(null); }}>
                Sign In
              </button>
            )}
            <button className="cart-btn" onClick={openCart}>
              <ShoppingBag size={20} />
              <span>Bag</span>
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </button>
            <button
              className="menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <aside
            className="mobile-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-header">
              <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close navigation menu"><X size={24} /></button>
            </div>
            <nav className="mobile-nav-links">
              <a href="#products" onClick={() => setIsMobileMenuOpen(false)}>Collection</a>
              <a href="#story" onClick={() => setIsMobileMenuOpen(false)}>Our Estates</a>
              <a href="#pairing" onClick={() => setIsMobileMenuOpen(false)}>Chef’s Secret</a>
              <a href="#reviews" onClick={() => setIsMobileMenuOpen(false)}>Reviews</a>
              <div className="mobile-contact-card" style={{ marginTop: '10px', paddingTop: '15px', borderTop: '1px solid var(--border-subtle)', fontSize: '13px', color: 'var(--color-muted)' }}>
                <strong>Contact Us</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-dark)', fontWeight: '600' }}>Vidwan NA</p>
                <a href="tel:+919019818197" style={{ color: 'var(--accent-amber)', textDecoration: 'none', fontWeight: '700', display: 'block', marginTop: '2px' }}>+91 9019818197</a>
              </div>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-muted)', wordBreak: 'break-all' }}>Signed in as {user.email}</span>
                  <button onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }}>Sign Out</button>
                </div>
              ) : (
                <button style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }} onClick={() => { setIsAuthOpen(true); setAuthMode('signin'); setIsMobileMenuOpen(false); }}>Sign In</button>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-sec">
        <div className="container hero-grid">
          <div className="hero-text-col">
            <div className="badge-pill">
              <Award size={14} /> Estate Fresh • Small Batch Roasted
            </div>
            <h2>India’s Finest Single-Origin Coffee & Grand Cru Pepper</h2>
            <p>
              Experience uncompromising purity. High-grown shade-shaded Arabica beans from the Western Ghats
              paired with legendary Tellicherry bold black peppercorns from Wayanad.
            </p>
            <div className="hero-btn-group">
              <a href="#products" className="btn-primary-dark">
                Shop The Collection <ArrowRight size={18} />
              </a>
              <div className="trust-badges">
                <div><ShieldCheck size={16} /> 100% Authentic GI Tag</div>
                <div><Truck size={16} /> Pan-India Shipping</div>
              </div>
            </div>
          </div>

          <div className="hero-cards-col">
            {products.length > 0 && (
              <>
                <div className="hero-preview-card" onClick={() => setSelectedProduct(products[0])}>
                  <img src={products[0].image_url} alt="Coffee" />
                  <div className="hero-card-info">
                    <span>{products[0].category}</span>
                    <h4>{products[0].name}</h4>
                    <p>₹{products[0].price} <small>/ {products[0].weight}</small></p>
                  </div>
                </div>
                <div className="hero-preview-card" onClick={() => setSelectedProduct(products[1] || products[0])}>
                  <img src={products[1]?.image_url || products[0].image_url} alt="Pepper" />
                  <div className="hero-card-info">
                    <span>{products[1]?.category || products[0].category}</span>
                    <h4>{products[1]?.name || products[0].name}</h4>
                    <p>₹{products[1]?.price || products[0].price} <small>/ {products[1]?.weight || products[0].weight}</small></p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="products-sec">
        <div className="container">
          <div className="section-title">
            <h3>The Artisan Duo</h3>
            <p>Two exceptional harvests. Masterfully curated for true connoisseurs.</p>
          </div>

          <div className="products-grid">
            {products.map(product => {
              const IconComponent = product.id.includes('coffee') ? Coffee : Flame;
              return (
                <div key={product.id} className="product-box">
                  <div className="product-img-wrap" onClick={() => setSelectedProduct(product)}>
                    <span className="product-tag">{product.badge}</span>
                    <img src={product.image} alt={product.name} />
                    <div className="quick-view-badge">Quick View</div>
                  </div>

                  <div className="product-content">
                    <div className="product-meta-row">
                      <span className="cat-pill"><IconComponent size={14} /> {product.category}</span>
                      <div className="rating-wrap">
                        <Star size={14} className="star-fill" />
                        <span>{product.rating}</span>
                        <span className="review-count">({product.reviewsCount})</span>
                      </div>
                    </div>

                    <h4 onClick={() => setSelectedProduct(product)}>{product.name}</h4>
                    <p className="product-desc-short">{product.tagline}</p>

                    <div className="flavor-pills">
                      {product.flavorNotes.map((note, i) => (
                        <span key={i} className="flavor-pill">{note}</span>
                      ))}
                    </div>

                    <div className="product-card-footer">
                      <div className="price-display">
                        <span className="currency">₹</span>
                        <span className="amount">{product.price}</span>
                        <span className="per-weight">/{product.weight.split('/')[0]}</span>
                      </div>
                      <button className="btn-add" onClick={() => addToCart(product, 1)}>
                        <Plus size={16} /> Add to Bag
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Estates & Sourcing Section */}
      <section id="story" className="story-sec">
        <div className="container story-wrapper">
          <div className="story-txt">
            <span className="sub-heading">Heritage Terroir</span>
            <h3>Rooted in the Ancient Hills of the Western Ghats</h3>
            <p>
              Our coffee thrives under a canopy of native shade trees alongside wild pepper vines. We partner directly
              with generational farmers in Karnataka and Kerala, ensuring ethical wages, biodiversity preservation,
              and absolute freshness delivered straight to your pantry.
            </p>
            <div className="estate-highlights">
              <div className="highlight-item">
                <MapPin size={20} className="text-accent" />
                <div>
                  <strong>BR Hills & Wayanad</strong>
                  <span>High-altitude GI tagged estates</span>
                </div>
              </div>
              <div className="highlight-item">
                <Clock size={20} className="text-accent" />
                <div>
                  <strong>Small-Batch Roasted</strong>
                  <span>Roasted weekly in micro-batches</span>
                </div>
              </div>
              <div className="highlight-item">
                <Package size={20} className="text-accent" />
                <div>
                  <strong>Aroma-Lock Packaging</strong>
                  <span>Foil sealed with one-way degassing valves</span>
                </div>
              </div>
            </div>
          </div>
          <div className="story-img">
            <img
              src="https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=800"
              alt="Coffee plantation"
            />
          </div>
        </div>
      </section>

      {/* Pairing Banner */}
      <section id="pairing" className="pairing-sec">
        <div className="container">
          <div className="pairing-card">
            <div className="pairing-icon-circle"><Sparkles size={28} /></div>
            <h3>The Master Chef & Barista Pairing Set</h3>
            <p>
              Master chefs know that freshly cracked Tellicherry black pepper elevates rich chocolate desserts,
              spiced rubs, and specialty dark roasts. Order both together and experience culinary synergy.
            </p>
            <button className="btn-light" onClick={() => {
              if (products[0]) addToCart(products[0], 1);
              if (products[1]) addToCart(products[1], 1);
            }}>
              Get The Complete Set (₹2,000)
            </button>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="reviews-sec">
        <div className="container">
          <div className="section-title">
            <h3>Loved Across India</h3>
            <p>Read unfiltered reviews from home brewers, café owners, and gourmands.</p>
          </div>

          <div className="reviews-grid">
            <div className="review-box">
              <div className="stars-row">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="star-fill" />)}
              </div>
              <p className="review-body">
                "The Attikan Estate coffee has an incredible dark chocolate profile with zero bitterness in my French Press. Absolute morning staple!"
              </p>
              <span className="reviewer">— Jaideep M., Bengaluru</span>
            </div>

            <div className="review-box">
              <div className="stars-row">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="star-fill" />)}
              </div>
              <p className="review-body">
                "You haven't tasted black pepper until you've tried Wayanad Tellicherry Extra Bold. The aroma hits you from across the room."
              </p>
              <span className="reviewer">— Anush S., Mumbai</span>
            </div>

            <div className="review-box">
              <div className="stars-row">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="star-fill" />)}
              </div>
              <p className="review-body">
                "Clean UI, lightning-fast delivery to Delhi, and world-class quality. Having only two products shows true dedication."
              </p>
              <span className="reviewer">— Jeethu K., New Delhi</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-col">
            <div className="footer-brand-wrap">
              <Coffee size={20} className="coffee-icon" />
              <span>KODAGU COFFEE</span>
            </div>
            <p>Pure single-origin specialty coffee and grand cru heirloom pepper. Directly from Indian estates.</p>
            <div className="footer-contact-box" style={{ marginTop: '16px' }}>
              <span style={{ display: 'block', fontSize: '12px', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Us</span>
              <strong style={{ display: 'block', color: 'white', fontSize: '15px', marginTop: '4px' }}>Vidwan NA</strong>
              <a href="tel:+919019818197" style={{ color: 'var(--accent-gold)', fontSize: '15px', fontWeight: '700', textDecoration: 'none', display: 'inline-block', marginTop: '2px' }}>+91 9019818197</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Quick Navigation</h4>
            <a href="#products">Our Products</a>
            <a href="#story">Estate Story</a>
            <a href="#pairing">Flavor Pairing</a>
            <a href="#reviews">Customer Reviews</a>
          </div>

          <div className="footer-col">
            <h4>Join the Journal</h4>
            <p>Receive brewing guides, harvest updates, and 15% off your first order.</p>
            {newsletterSubscribed ? (
              <div className="newsletter-success">
                <Check size={16} /> Subscribed successfully! Welcome aboard.
              </div>
            ) : (
              <form className="newsletter-form" onSubmit={(e) => {
                e.preventDefault();
                if (newsletterEmail) setNewsletterSubscribed(true);
              }}>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                />
                <button type="submit">Join</button>
              </form>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Kodagu Coffee Co. Proudly crafted in India. All rights reserved.</p>
        </div>
      </footer>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content-box" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedProduct(null)}>
              <X size={20} />
            </button>
            <div className="modal-grid">
              <div className="modal-img-col">
                <img src={selectedProduct.image} alt={selectedProduct.name} />
              </div>
              <div className="modal-txt-col">
                <span className="cat-pill">{selectedProduct.category}</span>
                <h2>{selectedProduct.name}</h2>
                <div className="modal-price-tag">
                  ₹{selectedProduct.price} <span>({selectedProduct.weight})</span>
                </div>
                <p className="modal-description">{selectedProduct.description}</p>

                <div className="modal-specs-list">
                  <div><strong>Origin:</strong> {selectedProduct.origin}</div>
                  <div><strong>Profile:</strong> {selectedProduct.roastLevel}</div>
                  <div><strong>Process:</strong> {selectedProduct.process}</div>
                </div>

                <div className="flavor-chips-grid">
                  {selectedProduct.flavorNotes.map((note, i) => (
                    <span key={i} className="chip-item">{note}</span>
                  ))}
                </div>

                <button
                  className="btn-primary-dark full-w"
                  onClick={() => {
                    addToCart(selectedProduct, 1);
                    setSelectedProduct(null);
                  }}
                >
                  Add to Bag — ₹{selectedProduct.price}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer / Slide-Over */}
      {isCartOpen && (
        <div className="drawer-backdrop" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header-row">
              <h3>Your Shopping Bag ({totalItems})</h3>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {checkoutStep === 'success' ? (
              <div className="success-state-view">
                <div className="success-icon-bubble"><Check size={32} /></div>
                <h3>Order Placed Successfully!</h3>
                <p>Thank you, <strong>{orderSuccess.name}</strong>. Your order ID is <code>{orderSuccess.id}</code>.</p>
                <p className="success-dispatch-note">We are carefully packing your estate-fresh goods for dispatch to {orderSuccess.city}.</p>
                <button className="btn-primary-dark full-w" onClick={() => {
                  setCheckoutStep('cart');
                  setIsCartOpen(false);
                }}>
                  Back to Store
                </button>
              </div>
            ) : checkoutStep === 'checkout' ? (
              <div className="checkout-form-container">
                <div className="back-link" onClick={() => setCheckoutStep('cart')}>
                  &larr; Return to Shopping Bag
                </div>
                <h4>Secure Checkout (India)</h4>
                <form onSubmit={handleCheckoutSubmit}>
                  <div className="field-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="field-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="rahul@example.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="field-group">
                    <label>Phone Number (for delivery updates)</label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="field-group">
                    <label>Delivery Address</label>
                    <textarea
                      required
                      rows="2"
                      placeholder="House/Flat no., Street name, Landmark"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="form-row-2">
                    <div className="field-group">
                      <label>City</label>
                      <input
                        type="text"
                        required
                        placeholder="Bengaluru"
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                    <div className="field-group">
                      <label>Pincode</label>
                      <input
                        type="text"
                        required
                        placeholder="560001"
                        value={formData.pincode}
                        onChange={e => setFormData({...formData, pincode: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="field-group">
                    <label>UPI ID or Payment Method</label>
                    <input
                      type="text"
                      required
                      placeholder="username@okhdfcbank"
                      value={formData.upiId}
                      onChange={e => setFormData({...formData, upiId: e.target.value})}
                    />
                  </div>

                  <div className="order-summary-box">
                    <div className="sum-row"><span>Subtotal:</span> <span>₹{cartSubtotal}</span></div>
                    <div className="sum-row"><span>Shipping:</span> <span>{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span></div>
                    <div className="sum-row total"><span>Total Payable:</span> <span>₹{cartTotal}</span></div>
                  </div>

                  <button type="submit" className="btn-primary-dark full-w">
                    Pay ₹{cartTotal} via UPI / Card
                  </button>
                </form>
              </div>
            ) : (
              <div className="cart-items-wrapper">
                {cart.length === 0 ? (
                  <div className="empty-cart-state">
                    <ShoppingBag size={48} className="text-light-muted" />
                    <p>Your shopping bag is empty.</p>
                    <button className="btn-secondary-outline" onClick={() => setIsCartOpen(false)}>
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="cart-scroll-list">
                      {cart.map(item => (
                        <div key={item.id} className="cart-item-row">
                          <img src={item.image} alt={item.name} />
                          <div className="cart-item-meta">
                            <h5>{item.name}</h5>
                            <span className="item-price-tag">₹{item.price}</span>
                            <div className="quantity-changer">
                              <button onClick={() => updateQuantity(item.id, -1)}><Minus size={12} /></button>
                              <span>{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)}><Plus size={12} /></button>
                            </div>
                          </div>
                          <button className="item-remove-btn" onClick={() => removeFromCart(item.id)}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="cart-checkout-footer">
                      <div className="subtotal-display">
                        <span>Subtotal</span>
                        <span>₹{cartSubtotal}</span>
                      </div>
                      <p className="shipping-calc-note">
                        {shippingFee === 0 ? '🎉 You unlocked FREE Shipping!' : `Add ₹${1000 - cartSubtotal} more for Free Shipping`}
                      </p>
                      <button
                        className="btn-primary-dark full-w"
                        onClick={() => setCheckoutStep('checkout')}
                      >
                        Proceed to Checkout (₹{cartSubtotal})
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Auth Modal */}
      {isAuthOpen && (
        <div className="modal-backdrop" onClick={() => setIsAuthOpen(false)}>
          <div className="modal-content-box auth-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsAuthOpen(false)}>
              <X size={20} />
            </button>
            <h3>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h3>
            {authSuccessMessage ? (
              <div className="auth-success-box">
                <p>{authSuccessMessage}</p>
                <button className="btn-primary-dark full-w" onClick={() => setIsAuthOpen(false)}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit}>
                <div className="field-group">
                  <label>Email</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label>Password</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                  />
                </div>
                {authError && <p className="auth-error-msg">{authError}</p>}
                <button type="submit" className="btn-primary-dark full-w" disabled={authLoading}>
                  {authLoading ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
                </button>
              </form>
            )}
            {!authSuccessMessage && (
              <p className="auth-toggle-txt">
                {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(null); }}>
                  {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
