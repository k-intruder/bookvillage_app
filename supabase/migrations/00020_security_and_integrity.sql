-- Security and integrity hardening

-- 한 도서는 동시에 하나의 활성 대출만 가질 수 있다.
CREATE UNIQUE INDEX IF NOT EXISTS rentals_one_active_per_book
  ON public.rentals(book_id)
  WHERE returned_at IS NULL;

-- 젤리 잔액 변경과 이력 기록을 하나의 트랜잭션에서 원자적으로 처리한다.
CREATE OR REPLACE FUNCTION public.change_jelly_balance(
  p_user_id uuid,
  p_amount integer,
  p_reason varchar,
  p_description text DEFAULT NULL,
  p_book_id uuid DEFAULT NULL,
  p_allow_partial_deduction boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_balance integer;
  applied_amount integer;
BEGIN
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'amount must not be zero';
  END IF;

  INSERT INTO public.jelly_balances (user_id, balance, total_earned)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT CASE
    WHEN p_amount < 0 AND p_allow_partial_deduction
      THEN -LEAST(-p_amount, balance)
    ELSE p_amount
  END
  INTO applied_amount
  FROM public.jelly_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  UPDATE public.jelly_balances
  SET balance = balance + applied_amount,
      total_earned = total_earned + GREATEST(applied_amount, 0),
      updated_at = now()
  WHERE user_id = p_user_id
    AND balance + applied_amount >= 0
  RETURNING balance INTO updated_balance;

  IF updated_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient jelly balance';
  END IF;

  IF applied_amount <> 0 THEN
    INSERT INTO public.jelly_history (user_id, amount, reason, description, book_id)
    VALUES (p_user_id, applied_amount, p_reason, p_description, p_book_id);
  END IF;

  RETURN updated_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.change_jelly_balance(uuid, integer, varchar, text, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_jelly_balance(uuid, integer, varchar, text, uuid, boolean)
  TO service_role;
