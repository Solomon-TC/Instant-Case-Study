CREATE OR REPLACE FUNCTION increment_generation_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET generation_count = generation_count + 1,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;