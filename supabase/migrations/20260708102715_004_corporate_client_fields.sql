/*
# Corporate Client Fields Migration

Add B2B/corporate client fields to repairs table for enterprise customers.

New Fields:
- is_corporate: boolean flag to indicate corporate/B2B client
- corporate_mof: Ministry of Finance number
- corporate_address: Business address (separate from customer personal address)
- corporate_email: Business email
- corporate_website: Business website
*/

-- Add corporate client fields to repairs table
ALTER TABLE repairs
  ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS corporate_mof TEXT,
  ADD COLUMN IF NOT EXISTS corporate_address TEXT,
  ADD COLUMN IF NOT EXISTS corporate_email TEXT,
  ADD COLUMN IF NOT EXISTS corporate_website TEXT;

-- Add comment for documentation
COMMENT ON COLUMN repairs.is_corporate IS 'Flag to indicate B2B/corporate client';
COMMENT ON COLUMN repairs.corporate_mof IS 'Ministry of Finance number for corporate clients';
COMMENT ON COLUMN repairs.corporate_address IS 'Business address for corporate clients';
COMMENT ON COLUMN repairs.corporate_email IS 'Business email for corporate clients';
COMMENT ON COLUMN repairs.corporate_website IS 'Business website for corporate clients';

-- Create index for filtering corporate repairs
CREATE INDEX IF NOT EXISTS idx_repairs_is_corporate ON repairs(is_corporate) WHERE is_corporate = TRUE;