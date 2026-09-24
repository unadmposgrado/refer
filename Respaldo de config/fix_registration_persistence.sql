-- ==========================================
-- CORRECCIÓN DEL SISTEMA DE REGISTRO
-- ==========================================
-- Este script actualiza la función de trigger para asegurar que
-- todos los metadatos del registro se persistan en la tabla profiles.

-- 1. Asegurar que las columnas existen (por seguridad, aunque el usuario indica que ya están)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tipo_usuario') THEN
        ALTER TABLE public.profiles ADD COLUMN tipo_usuario TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='nivel_educativo') THEN
        ALTER TABLE public.profiles ADD COLUMN nivel_educativo TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='division') THEN
        ALTER TABLE public.profiles ADD COLUMN division TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='matricula') THEN
        ALTER TABLE public.profiles ADD COLUMN matricula TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='metadata') THEN
        ALTER TABLE public.profiles ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Actualizar la función handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    tipo_usuario,
    nivel_educativo,
    division,
    program_id,
    matricula,
    metadata,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'tipo_usuario',
    NEW.raw_user_meta_data->>'nivel_educativo',
    NEW.raw_user_meta_data->>'division',
    NULLIF(NEW.raw_user_meta_data->>'program_id', '')::uuid,
    NEW.raw_user_meta_data->>'matricula',
    COALESCE((NEW.raw_user_meta_data->'metadata')::jsonb, '{}'::jsonb),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-crear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Nota: Ejecutar esto en el SQL Editor de Supabase.
