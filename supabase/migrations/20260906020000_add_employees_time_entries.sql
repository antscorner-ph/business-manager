-- Employee time-keeping: employees and their clock in/out time entries.

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  -- Optional hourly rate used to compute pay on timesheets.
  hourly_rate NUMERIC(10, 2),
  -- Optional short PIN (e.g. 4 digits) required at the Time Clock to clock in/out.
  pin TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- NULL clock_out means the employee is currently clocked in.
  clock_out TIMESTAMP WITH TIME ZONE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS with public policies to match the rest of the app.
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.employees FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.employees FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.time_entries FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.time_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.time_entries FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.time_entries FOR DELETE USING (true);

-- Indexes for common lookups.
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON public.time_entries(clock_in DESC);
-- At most one open (not-yet-clocked-out) entry per employee.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_time_entry_per_employee
  ON public.time_entries(employee_id)
  WHERE clock_out IS NULL;

-- Reuse the shared updated_at trigger function if present; create if missing.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON public.time_entries;
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
