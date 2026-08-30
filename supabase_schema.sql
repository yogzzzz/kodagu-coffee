-- Kodagu Coffee Supabase Database Schema
-- Run this entire script in your Supabase SQL Editor

-- 1. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL,
    weight TEXT NOT NULL,
    rating NUMERIC DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    badge TEXT,
    tagline TEXT,
    description TEXT,
    flavor_notes TEXT[],
    origin TEXT,
    roast_level TEXT,
    process TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    pincode TEXT NOT NULL,
    upi_id TEXT NOT NULL,
    subtotal NUMERIC NOT NULL,
    shipping_fee NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending_payment' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    quantity INT NOT NULL,
    price NUMERIC NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Anyone can view products
CREATE POLICY "Allow public read access on products"
    ON public.products FOR SELECT USING (true);

-- Anyone (including guests) can insert orders
CREATE POLICY "Allow public insert on orders"
    ON public.orders FOR INSERT WITH CHECK (true);

-- Users can view their own orders, or anonymous can insert order items
CREATE POLICY "Allow public insert on order_items"
    ON public.order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to view their own orders"
    ON public.orders FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- 6. Insert Initial Products (Attikan Coffee & Wayanad Pepper)
INSERT INTO public.products (id, name, category, price, weight, rating, reviews_count, badge, tagline, description, flavor_notes, origin, roast_level, process, image_url)
VALUES
('coffee-01', 'Attikan Estate Specialty Arabica Coffee', 'Single-Origin Roast', 800, 'kg', 4.9, 312, 'Master Roasters Choice', 'Dark chocolate, roasted hazelnut & dried dark cherry notes', 'Cultivated at 4,200 ft elevation in the lush Biligirirangan Hills of South India. Slow-roasted in small batches to deliver a bold, smooth body with low acidity and a lingering cocoa finish.', ARRAY['Dark Chocolate', 'Roasted Hazelnut', 'Dark Cherry', 'Caramel'], 'BR Hills, Karnataka, India', 'Medium-Dark Roast', 'Washed Arabica', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=800'),
('pepper-01', 'Wayanad Tellicherry Extra Bold Peppercorns', 'Grand Cru Spice', 1200, 'kg', 5.0, 184, 'GI Certified Origin', 'Intense aroma, warm citrus notes & robust heat', 'Harvested from heirloom spice vines nestled in the mist-shrouded hills of Wayanad. Only the largest 5% whole berries are hand-selected, sun-dried, and packed fresh to preserve volatile aromatic oils.', ARRAY['Warm Citrus', 'Pine Resin', 'Earthy Pungency', 'Fruity Finish'], 'Wayanad, Kerala, India', 'Sun-Dried Whole Peppercorns', 'Hand-Picked & Vine-Ripened', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800')
ON CONFLICT (id) DO UPDATE SET
    price = EXCLUDED.price,
    weight = EXCLUDED.weight;
