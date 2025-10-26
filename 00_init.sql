-- users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- accounts (demo balances)
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  currency text NOT NULL,
  balance numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- positions (portfolio)
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  qty numeric NOT NULL,
  avg_price numeric NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- trades
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  side text NOT NULL, -- BUY / SELL
  symbol text NOT NULL,
  qty numeric NOT NULL,
  price numeric NOT NULL,
  usd_value numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- payments (demo / incoming webhooks)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  provider text,
  provider_id text,
  amount numeric,
  currency text,
  status text,
  created_at timestamptz DEFAULT now()
);