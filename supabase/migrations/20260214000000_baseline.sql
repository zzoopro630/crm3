--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: marketing; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA marketing;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: seo; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA seo;


--
-- Name: approval_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: card_order_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.card_order_status_enum AS ENUM (
    'pending',
    'confirmed',
    'printing',
    'shipped',
    'completed',
    'cancelled'
);


--
-- Name: customer_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.customer_status_enum AS ENUM (
    'new',
    'contacted',
    'consulting',
    'closed',
    'called',
    'texted',
    'no_answer',
    'rejected',
    'wrong_number',
    'ineligible',
    'upsell'
);


--
-- Name: customer_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.customer_type_enum AS ENUM (
    'personal',
    'db'
);


--
-- Name: gender_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gender_enum AS ENUM (
    '남성',
    '여성',
    '법인'
);


--
-- Name: job_title_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_title_enum AS ENUM (
    '대표',
    '총괄이사',
    '사업단장',
    '지점장',
    '팀장',
    '실장',
    '과장',
    '대리'
);


--
-- Name: order_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status_enum AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled'
);


--
-- Name: security_level_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.security_level_enum AS ENUM (
    'F1',
    'F2',
    'F3',
    'F4',
    'F5',
    'M1',
    'M2',
    'M3'
);


--
-- Name: fix_consultant_inquiry_time(); Type: FUNCTION; Schema: marketing; Owner: -
--

CREATE FUNCTION marketing.fix_consultant_inquiry_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.inquiry_date IS NOT NULL THEN
    IF EXTRACT(HOUR FROM NEW.inquiry_date) = 0
       AND EXTRACT(MINUTE FROM NEW.inquiry_date) = 0
       AND EXTRACT(SECOND FROM NEW.inquiry_date) = 0 THEN
      NEW.inquiry_date := NEW.inquiry_date + INTERVAL '12 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: route_recruit_inquiry(); Type: FUNCTION; Schema: marketing; Owner: -
--

CREATE FUNCTION marketing.route_recruit_inquiry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- source_url이 form 456이거나 utm_campaign에 recruit 포함 시
  IF (NEW.source_url ILIKE '%contact-forms/456%') OR (NEW.utm_campaign ILIKE '%recruit%') THEN
    INSERT INTO marketing.recruit_inquiries (customer_name, phone, request, utm_campaign, source_url, inquiry_date, manager_id, status, memo, admin_comment)
    VALUES (NEW.customer_name, NEW.phone, NEW.request, NEW.utm_campaign, NEW.source_url, NEW.inquiry_date, NEW.manager_id, NEW.status, NEW.memo, NEW.admin_comment);
    -- 원본 INSERT를 취소 (inquiries에 저장하지 않음)
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_inquiry_time(); Type: FUNCTION; Schema: marketing; Owner: -
--

CREATE FUNCTION marketing.set_inquiry_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.inquiry_date IS NULL OR NEW.inquiry_date::time = '00:00:00' THEN
    NEW.inquiry_date := COALESCE(NEW.created_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: marketing; Owner: -
--

CREATE FUNCTION marketing.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: increment_post_view_count(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_post_view_count(p_post_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_post_id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: keyword_reports; Type: TABLE; Schema: marketing; Owner: -
--

CREATE TABLE marketing.keyword_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_group text NOT NULL,
    keyword_category text NOT NULL,
    report_date date NOT NULL,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    click_rate numeric,
    avg_cpc numeric,
    total_cost numeric,
    avg_position numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: save_keyword_reports(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_keyword_reports(reports jsonb) RETURNS SETOF marketing.keyword_reports
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  INSERT INTO marketing.keyword_reports (
    ad_group, keyword_category, report_date, impressions, clicks,
    click_rate, avg_cpc, total_cost, avg_position
  )
  SELECT
    (r->>'ad_group')::text,
    (r->>'keyword_category')::text,
    (r->>'report_date')::date,
    (r->>'impressions')::integer,
    (r->>'clicks')::integer,
    (r->>'click_rate')::numeric,
    (r->>'avg_cpc')::numeric,
    (r->>'total_cost')::numeric,
    (r->>'avg_position')::numeric
  FROM jsonb_array_elements(reports) AS r
  ON CONFLICT (ad_group, report_date) 
  DO UPDATE SET
    keyword_category = EXCLUDED.keyword_category,
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    click_rate = EXCLUDED.click_rate,
    avg_cpc = EXCLUDED.avg_cpc,
    total_cost = EXCLUDED.total_cost,
    avg_position = EXCLUDED.avg_position,
    updated_at = NOW()
  RETURNING *;
END;
$$;


--
-- Name: consultant_inquiries; Type: TABLE; Schema: marketing; Owner: -
--

CREATE TABLE marketing.consultant_inquiries (
    id integer NOT NULL,
    customer_name text NOT NULL,
    phone text,
    product_name text,
    consultant text,
    tf_ref text,
    referer_page text,
    request text,
    source_url text,
    inquiry_date timestamp with time zone DEFAULT now(),
    manager_id uuid,
    status text DEFAULT 'new'::text,
    memo text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    admin_comment text
);


--
-- Name: consultant_inquiries_id_seq; Type: SEQUENCE; Schema: marketing; Owner: -
--

CREATE SEQUENCE marketing.consultant_inquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consultant_inquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: marketing; Owner: -
--

ALTER SEQUENCE marketing.consultant_inquiries_id_seq OWNED BY marketing.consultant_inquiries.id;


--
-- Name: ga_summary; Type: TABLE; Schema: marketing; Owner: -
--

CREATE TABLE marketing.ga_summary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insurance_name text NOT NULL,
    sessions integer DEFAULT 0,
    key_events integer DEFAULT 0,
    active_users integer DEFAULT 0,
    landing_db_rate numeric,
    report_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: ga_totals; Type: TABLE; Schema: marketing; Owner: -
--

CREATE TABLE marketing.ga_totals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sessions integer DEFAULT 0,
    conversions integer DEFAULT 0,
    active_users integer DEFAULT 0,
    report_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: inquiries; Type: TABLE; Schema: marketing; Owner: -
--

CREATE TABLE marketing.inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_name text,
    phone text,
    product_name text,
    utm_campaign text,
    source_url text,
    inquiry_date timestamp with time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    birthday date,
    sex text,
    request text,
    manager_id uuid,
    status text DEFAULT 'new'::text,
    email text,
    memo text,
    updated_at timestamp with time zone DEFAULT now(),
    admin_comment text
);


--
-- Name: keyword_details; Type: TABLE; Schema: marketing; Owner: -
--

CREATE TABLE marketing.keyword_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_group text NOT NULL,
    keyword text NOT NULL,
    report_date date NOT NULL,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    click_rate numeric,
    avg_cpc numeric,
    total_cost numeric,
    avg_position numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: recruit_inquiries; Type: TABLE; Schema: marketing; Owner: -
--

CREATE TABLE marketing.recruit_inquiries (
    id bigint NOT NULL,
    customer_name text,
    phone text,
    age text,
    area text,
    career text,
    request text,
    referer_page text,
    utm_campaign text,
    source_url text,
    inquiry_date timestamp with time zone,
    manager_id uuid,
    status text DEFAULT 'new'::text,
    memo text,
    admin_comment text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: recruit_inquiries_id_seq; Type: SEQUENCE; Schema: marketing; Owner: -
--

CREATE SEQUENCE marketing.recruit_inquiries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recruit_inquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: marketing; Owner: -
--

ALTER SEQUENCE marketing.recruit_inquiries_id_seq OWNED BY marketing.recruit_inquiries.id;


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_settings_id_seq OWNED BY public.app_settings.id;


--
-- Name: board_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_categories (
    id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    icon text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    display_type text DEFAULT 'table'::text
);


--
-- Name: board_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.board_categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.board_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: card_order_applicants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_order_applicants (
    id integer NOT NULL,
    order_id integer NOT NULL,
    design integer NOT NULL,
    design_label text,
    card_type text NOT NULL,
    name text NOT NULL,
    grade text,
    branch text,
    phone text,
    email text,
    fax text,
    addr_base text,
    addr_detail text,
    request text,
    qty integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: card_order_applicants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.card_order_applicants ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.card_order_applicants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: card_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_orders (
    id integer NOT NULL,
    ordered_by uuid NOT NULL,
    total_qty integer DEFAULT 0 NOT NULL,
    delivery_fee integer DEFAULT 0 NOT NULL,
    total_amount integer DEFAULT 0 NOT NULL,
    status public.card_order_status_enum DEFAULT 'pending'::public.card_order_status_enum NOT NULL,
    recipient_name text,
    recipient_phone text,
    recipient_address text,
    recipient_email text,
    cancelled_at timestamp without time zone,
    cancelled_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: card_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.card_orders ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.card_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    title public.job_title_enum,
    team text DEFAULT '미지정'::text,
    phone text NOT NULL,
    manager_id uuid,
    employee_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    insurance_company text NOT NULL,
    product_name text NOT NULL,
    premium integer,
    payment_period text,
    memo text,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.contracts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contracts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: customer_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id integer NOT NULL,
    label_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: customer_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_notes (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    content text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: customer_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.customer_notes ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.customer_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    manager_id uuid NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    gender public.gender_enum,
    birthdate date,
    company text,
    job_title text,
    source text,
    status public.customer_status_enum DEFAULT 'new'::public.customer_status_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    type public.customer_type_enum DEFAULT 'personal'::public.customer_type_enum NOT NULL,
    interest_product text,
    memo text,
    admin_comment text,
    address_detail text,
    nationality text,
    existing_insurance text,
    insurance_type text,
    annual_income text,
    marital_status text,
    notes text,
    deleted_at timestamp without time zone
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.customers ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.customers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dashboard_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_cards (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    image_url text,
    link_url text,
    sort_order integer DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: dashboard_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.dashboard_cards ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dashboard_cards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: employee_menu_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_menu_overrides (
    id integer NOT NULL,
    employee_id uuid NOT NULL,
    menu_path text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_menu_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_menu_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_menu_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_menu_overrides_id_seq OWNED BY public.employee_menu_overrides.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    security_level public.security_level_enum DEFAULT 'F5'::public.security_level_enum NOT NULL,
    parent_id uuid,
    position_name text,
    department text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    organization_id integer
);


--
-- Name: keyword_reports; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.keyword_reports WITH (security_invoker='on') AS
 SELECT id,
    ad_group,
    keyword_category,
    report_date,
    impressions,
    clicks,
    click_rate,
    avg_cpc,
    total_cost,
    avg_position,
    created_at,
    updated_at
   FROM marketing.keyword_reports;


--
-- Name: labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#6B7280'::text NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lead_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    region text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price integer NOT NULL,
    total_price integer NOT NULL
);


--
-- Name: lead_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lead_order_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lead_order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lead_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_orders (
    id integer NOT NULL,
    ordered_by uuid NOT NULL,
    name text NOT NULL,
    affiliation text,
    "position" text,
    phone text,
    email text,
    total_amount integer DEFAULT 0 NOT NULL,
    status public.order_status_enum DEFAULT 'pending'::public.order_status_enum NOT NULL,
    cancelled_at timestamp without time zone,
    cancelled_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: lead_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lead_orders ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lead_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lead_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_products (
    id integer NOT NULL,
    db_type text NOT NULL,
    name text NOT NULL,
    price integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lead_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lead_products ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lead_products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    parent_id integer,
    manager_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.organizations ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    icon text,
    sort_order integer DEFAULT 0,
    is_published boolean DEFAULT false,
    author_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: pages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pages ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pending_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    requested_at timestamp without time zone DEFAULT now(),
    status public.approval_status_enum DEFAULT 'pending'::public.approval_status_enum,
    processed_by uuid,
    processed_at timestamp without time zone
);


--
-- Name: post_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_attachments (
    id integer NOT NULL,
    post_id integer NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: post_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.post_attachments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.post_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_pinned boolean DEFAULT false,
    author_id uuid NOT NULL,
    view_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.posts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: sources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sources ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: keywords; Type: TABLE; Schema: seo; Owner: -
--

CREATE TABLE seo.keywords (
    id bigint NOT NULL,
    keyword text NOT NULL,
    site_id bigint NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: keywords_id_seq; Type: SEQUENCE; Schema: seo; Owner: -
--

CREATE SEQUENCE seo.keywords_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: keywords_id_seq; Type: SEQUENCE OWNED BY; Schema: seo; Owner: -
--

ALTER SEQUENCE seo.keywords_id_seq OWNED BY seo.keywords.id;


--
-- Name: rankings; Type: TABLE; Schema: seo; Owner: -
--

CREATE TABLE seo.rankings (
    id bigint NOT NULL,
    keyword_id bigint NOT NULL,
    rank_position integer,
    search_type text DEFAULT 'view'::text,
    checked_at timestamp without time zone DEFAULT now(),
    result_url text,
    result_title text
);


--
-- Name: rankings_id_seq; Type: SEQUENCE; Schema: seo; Owner: -
--

CREATE SEQUENCE seo.rankings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rankings_id_seq; Type: SEQUENCE OWNED BY; Schema: seo; Owner: -
--

ALTER SEQUENCE seo.rankings_id_seq OWNED BY seo.rankings.id;


--
-- Name: sites; Type: TABLE; Schema: seo; Owner: -
--

CREATE TABLE seo.sites (
    id bigint NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: sites_id_seq; Type: SEQUENCE; Schema: seo; Owner: -
--

CREATE SEQUENCE seo.sites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sites_id_seq; Type: SEQUENCE OWNED BY; Schema: seo; Owner: -
--

ALTER SEQUENCE seo.sites_id_seq OWNED BY seo.sites.id;


--
-- Name: tracked_urls; Type: TABLE; Schema: seo; Owner: -
--

CREATE TABLE seo.tracked_urls (
    id bigint NOT NULL,
    keyword text NOT NULL,
    target_url text NOT NULL,
    section text,
    memo text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: tracked_urls_id_seq; Type: SEQUENCE; Schema: seo; Owner: -
--

CREATE SEQUENCE seo.tracked_urls_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tracked_urls_id_seq; Type: SEQUENCE OWNED BY; Schema: seo; Owner: -
--

ALTER SEQUENCE seo.tracked_urls_id_seq OWNED BY seo.tracked_urls.id;


--
-- Name: url_rankings; Type: TABLE; Schema: seo; Owner: -
--

CREATE TABLE seo.url_rankings (
    id bigint NOT NULL,
    tracked_url_id bigint NOT NULL,
    rank_position integer,
    section_name text,
    section_rank integer,
    checked_at timestamp without time zone DEFAULT now(),
    is_exposed boolean DEFAULT false NOT NULL,
    section_exists boolean DEFAULT true NOT NULL
);


--
-- Name: url_rankings_id_seq; Type: SEQUENCE; Schema: seo; Owner: -
--

CREATE SEQUENCE seo.url_rankings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: url_rankings_id_seq; Type: SEQUENCE OWNED BY; Schema: seo; Owner: -
--

ALTER SEQUENCE seo.url_rankings_id_seq OWNED BY seo.url_rankings.id;


--
-- Name: consultant_inquiries id; Type: DEFAULT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.consultant_inquiries ALTER COLUMN id SET DEFAULT nextval('marketing.consultant_inquiries_id_seq'::regclass);


--
-- Name: recruit_inquiries id; Type: DEFAULT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.recruit_inquiries ALTER COLUMN id SET DEFAULT nextval('marketing.recruit_inquiries_id_seq'::regclass);


--
-- Name: app_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings ALTER COLUMN id SET DEFAULT nextval('public.app_settings_id_seq'::regclass);


--
-- Name: employee_menu_overrides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_menu_overrides ALTER COLUMN id SET DEFAULT nextval('public.employee_menu_overrides_id_seq'::regclass);


--
-- Name: keywords id; Type: DEFAULT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.keywords ALTER COLUMN id SET DEFAULT nextval('seo.keywords_id_seq'::regclass);


--
-- Name: rankings id; Type: DEFAULT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.rankings ALTER COLUMN id SET DEFAULT nextval('seo.rankings_id_seq'::regclass);


--
-- Name: sites id; Type: DEFAULT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.sites ALTER COLUMN id SET DEFAULT nextval('seo.sites_id_seq'::regclass);


--
-- Name: tracked_urls id; Type: DEFAULT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.tracked_urls ALTER COLUMN id SET DEFAULT nextval('seo.tracked_urls_id_seq'::regclass);


--
-- Name: url_rankings id; Type: DEFAULT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.url_rankings ALTER COLUMN id SET DEFAULT nextval('seo.url_rankings_id_seq'::regclass);


--
-- Name: consultant_inquiries consultant_inquiries_pkey; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.consultant_inquiries
    ADD CONSTRAINT consultant_inquiries_pkey PRIMARY KEY (id);


--
-- Name: ga_summary ga_summary_insurance_name_report_date_key; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.ga_summary
    ADD CONSTRAINT ga_summary_insurance_name_report_date_key UNIQUE (insurance_name, report_date);


--
-- Name: ga_summary ga_summary_pkey; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.ga_summary
    ADD CONSTRAINT ga_summary_pkey PRIMARY KEY (id);


--
-- Name: ga_totals ga_totals_pkey; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.ga_totals
    ADD CONSTRAINT ga_totals_pkey PRIMARY KEY (id);


--
-- Name: ga_totals ga_totals_report_date_key; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.ga_totals
    ADD CONSTRAINT ga_totals_report_date_key UNIQUE (report_date);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: keyword_details keyword_details_ad_group_keyword_date_key; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.keyword_details
    ADD CONSTRAINT keyword_details_ad_group_keyword_date_key UNIQUE (ad_group, keyword, report_date);


--
-- Name: keyword_details keyword_details_pkey; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.keyword_details
    ADD CONSTRAINT keyword_details_pkey PRIMARY KEY (id);


--
-- Name: keyword_details keyword_details_unique; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.keyword_details
    ADD CONSTRAINT keyword_details_unique UNIQUE (ad_group, keyword, report_date);


--
-- Name: keyword_reports keyword_reports_ad_group_keyword_date_key; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.keyword_reports
    ADD CONSTRAINT keyword_reports_ad_group_keyword_date_key UNIQUE (ad_group, keyword_category, report_date);


--
-- Name: keyword_reports keyword_reports_ad_group_report_date_key; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.keyword_reports
    ADD CONSTRAINT keyword_reports_ad_group_report_date_key UNIQUE (ad_group, report_date);


--
-- Name: keyword_reports keyword_reports_pkey; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.keyword_reports
    ADD CONSTRAINT keyword_reports_pkey PRIMARY KEY (id);


--
-- Name: recruit_inquiries recruit_inquiries_pkey; Type: CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.recruit_inquiries
    ADD CONSTRAINT recruit_inquiries_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_key_key UNIQUE (key);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: board_categories board_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_categories
    ADD CONSTRAINT board_categories_pkey PRIMARY KEY (id);


--
-- Name: board_categories board_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_categories
    ADD CONSTRAINT board_categories_slug_key UNIQUE (slug);


--
-- Name: card_order_applicants card_order_applicants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_order_applicants
    ADD CONSTRAINT card_order_applicants_pkey PRIMARY KEY (id);


--
-- Name: card_orders card_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_orders
    ADD CONSTRAINT card_orders_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: customer_labels customer_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_labels
    ADD CONSTRAINT customer_labels_pkey PRIMARY KEY (id);


--
-- Name: customer_notes customer_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: dashboard_cards dashboard_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cards
    ADD CONSTRAINT dashboard_cards_pkey PRIMARY KEY (id);


--
-- Name: employee_menu_overrides employee_menu_overrides_employee_id_menu_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_menu_overrides
    ADD CONSTRAINT employee_menu_overrides_employee_id_menu_path_key UNIQUE (employee_id, menu_path);


--
-- Name: employee_menu_overrides employee_menu_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_menu_overrides
    ADD CONSTRAINT employee_menu_overrides_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_unique UNIQUE (email);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: labels labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_pkey PRIMARY KEY (id);


--
-- Name: lead_order_items lead_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_order_items
    ADD CONSTRAINT lead_order_items_pkey PRIMARY KEY (id);


--
-- Name: lead_orders lead_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_orders
    ADD CONSTRAINT lead_orders_pkey PRIMARY KEY (id);


--
-- Name: lead_products lead_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_products
    ADD CONSTRAINT lead_products_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: pages pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_slug_key UNIQUE (slug);


--
-- Name: pending_approvals pending_approvals_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_approvals
    ADD CONSTRAINT pending_approvals_email_unique UNIQUE (email);


--
-- Name: pending_approvals pending_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_approvals
    ADD CONSTRAINT pending_approvals_pkey PRIMARY KEY (id);


--
-- Name: post_attachments post_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_attachments
    ADD CONSTRAINT post_attachments_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: sources sources_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_name_unique UNIQUE (name);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: keywords keywords_pkey; Type: CONSTRAINT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.keywords
    ADD CONSTRAINT keywords_pkey PRIMARY KEY (id);


--
-- Name: rankings rankings_pkey; Type: CONSTRAINT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.rankings
    ADD CONSTRAINT rankings_pkey PRIMARY KEY (id);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: tracked_urls tracked_urls_pkey; Type: CONSTRAINT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.tracked_urls
    ADD CONSTRAINT tracked_urls_pkey PRIMARY KEY (id);


--
-- Name: url_rankings url_rankings_pkey; Type: CONSTRAINT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.url_rankings
    ADD CONSTRAINT url_rankings_pkey PRIMARY KEY (id);


--
-- Name: idx_ga_summary_date; Type: INDEX; Schema: marketing; Owner: -
--

CREATE INDEX idx_ga_summary_date ON marketing.ga_summary USING btree (report_date);


--
-- Name: idx_ga_totals_date; Type: INDEX; Schema: marketing; Owner: -
--

CREATE INDEX idx_ga_totals_date ON marketing.ga_totals USING btree (report_date);


--
-- Name: idx_inquiries_date; Type: INDEX; Schema: marketing; Owner: -
--

CREATE INDEX idx_inquiries_date ON marketing.inquiries USING btree (inquiry_date);


--
-- Name: idx_keyword_details_ad_group; Type: INDEX; Schema: marketing; Owner: -
--

CREATE INDEX idx_keyword_details_ad_group ON marketing.keyword_details USING btree (ad_group);


--
-- Name: idx_keyword_details_cost; Type: INDEX; Schema: marketing; Owner: -
--

CREATE INDEX idx_keyword_details_cost ON marketing.keyword_details USING btree (total_cost);


--
-- Name: idx_keyword_details_date; Type: INDEX; Schema: marketing; Owner: -
--

CREATE INDEX idx_keyword_details_date ON marketing.keyword_details USING btree (report_date);


--
-- Name: idx_keyword_reports_ad_group; Type: INDEX; Schema: marketing; Owner: -
--

CREATE INDEX idx_keyword_reports_ad_group ON marketing.keyword_reports USING btree (ad_group);


--
-- Name: idx_keyword_reports_date; Type: INDEX; Schema: marketing; Owner: -
--

CREATE INDEX idx_keyword_reports_date ON marketing.keyword_reports USING btree (report_date);


--
-- Name: idx_recruit_inquiries_date; Type: INDEX; Schema: marketing; Owner: -
--

CREATE INDEX idx_recruit_inquiries_date ON marketing.recruit_inquiries USING btree (inquiry_date);


--
-- Name: idx_seo_keywords_site_id; Type: INDEX; Schema: seo; Owner: -
--

CREATE INDEX idx_seo_keywords_site_id ON seo.keywords USING btree (site_id);


--
-- Name: idx_seo_rankings_checked_at; Type: INDEX; Schema: seo; Owner: -
--

CREATE INDEX idx_seo_rankings_checked_at ON seo.rankings USING btree (checked_at);


--
-- Name: idx_seo_rankings_keyword_id; Type: INDEX; Schema: seo; Owner: -
--

CREATE INDEX idx_seo_rankings_keyword_id ON seo.rankings USING btree (keyword_id);


--
-- Name: idx_seo_tracked_urls_active; Type: INDEX; Schema: seo; Owner: -
--

CREATE INDEX idx_seo_tracked_urls_active ON seo.tracked_urls USING btree (is_active);


--
-- Name: idx_seo_url_rankings_checked_at; Type: INDEX; Schema: seo; Owner: -
--

CREATE INDEX idx_seo_url_rankings_checked_at ON seo.url_rankings USING btree (checked_at);


--
-- Name: idx_seo_url_rankings_tracked_url_id; Type: INDEX; Schema: seo; Owner: -
--

CREATE INDEX idx_seo_url_rankings_tracked_url_id ON seo.url_rankings USING btree (tracked_url_id);


--
-- Name: ga_summary ga_summary_updated_at; Type: TRIGGER; Schema: marketing; Owner: -
--

CREATE TRIGGER ga_summary_updated_at BEFORE UPDATE ON marketing.ga_summary FOR EACH ROW EXECUTE FUNCTION marketing.update_updated_at();


--
-- Name: ga_totals ga_totals_updated_at; Type: TRIGGER; Schema: marketing; Owner: -
--

CREATE TRIGGER ga_totals_updated_at BEFORE UPDATE ON marketing.ga_totals FOR EACH ROW EXECUTE FUNCTION marketing.update_updated_at();


--
-- Name: consultant_inquiries trg_fix_consultant_inquiry_time; Type: TRIGGER; Schema: marketing; Owner: -
--

CREATE TRIGGER trg_fix_consultant_inquiry_time BEFORE INSERT OR UPDATE ON marketing.consultant_inquiries FOR EACH ROW EXECUTE FUNCTION marketing.fix_consultant_inquiry_time();


--
-- Name: inquiries trg_route_recruit_inquiry; Type: TRIGGER; Schema: marketing; Owner: -
--

CREATE TRIGGER trg_route_recruit_inquiry BEFORE INSERT ON marketing.inquiries FOR EACH ROW EXECUTE FUNCTION marketing.route_recruit_inquiry();


--
-- Name: inquiries trg_set_inquiry_time; Type: TRIGGER; Schema: marketing; Owner: -
--

CREATE TRIGGER trg_set_inquiry_time BEFORE INSERT ON marketing.inquiries FOR EACH ROW EXECUTE FUNCTION marketing.set_inquiry_time();


--
-- Name: consultant_inquiries consultant_inquiries_manager_id_fkey; Type: FK CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.consultant_inquiries
    ADD CONSTRAINT consultant_inquiries_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: inquiries inquiries_manager_id_fkey; Type: FK CONSTRAINT; Schema: marketing; Owner: -
--

ALTER TABLE ONLY marketing.inquiries
    ADD CONSTRAINT inquiries_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id);


--
-- Name: card_order_applicants card_order_applicants_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_order_applicants
    ADD CONSTRAINT card_order_applicants_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.card_orders(id) ON DELETE CASCADE;


--
-- Name: card_orders card_orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_orders
    ADD CONSTRAINT card_orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: card_orders card_orders_ordered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_orders
    ADD CONSTRAINT card_orders_ordered_by_fkey FOREIGN KEY (ordered_by) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: contacts contacts_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_manager_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_manager_id_contacts_id_fk FOREIGN KEY (manager_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_created_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_created_by_employees_id_fk FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: contracts contracts_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_labels customer_labels_created_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_labels
    ADD CONSTRAINT customer_labels_created_by_employees_id_fk FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: customer_labels customer_labels_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_labels
    ADD CONSTRAINT customer_labels_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_labels customer_labels_label_id_labels_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_labels
    ADD CONSTRAINT customer_labels_label_id_labels_id_fk FOREIGN KEY (label_id) REFERENCES public.labels(id) ON DELETE CASCADE;


--
-- Name: customer_notes customer_notes_created_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_created_by_employees_id_fk FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: customer_notes customer_notes_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customers customers_manager_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_manager_id_employees_id_fk FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: dashboard_cards dashboard_cards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cards
    ADD CONSTRAINT dashboard_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: employee_menu_overrides employee_menu_overrides_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_menu_overrides
    ADD CONSTRAINT employee_menu_overrides_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employees employees_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: employees employees_parent_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_parent_id_employees_id_fk FOREIGN KEY (parent_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: labels labels_created_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_created_by_employees_id_fk FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: lead_order_items lead_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_order_items
    ADD CONSTRAINT lead_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.lead_orders(id) ON DELETE CASCADE;


--
-- Name: lead_order_items lead_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_order_items
    ADD CONSTRAINT lead_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.lead_products(id) ON DELETE RESTRICT;


--
-- Name: lead_orders lead_orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_orders
    ADD CONSTRAINT lead_orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: lead_orders lead_orders_ordered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_orders
    ADD CONSTRAINT lead_orders_ordered_by_fkey FOREIGN KEY (ordered_by) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: organizations organizations_parent_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_parent_id_organizations_id_fk FOREIGN KEY (parent_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: pages pages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: pending_approvals pending_approvals_processed_by_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_approvals
    ADD CONSTRAINT pending_approvals_processed_by_employees_id_fk FOREIGN KEY (processed_by) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: post_attachments post_attachments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_attachments
    ADD CONSTRAINT post_attachments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: keywords keywords_site_id_sites_id_fkey; Type: FK CONSTRAINT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.keywords
    ADD CONSTRAINT keywords_site_id_sites_id_fkey FOREIGN KEY (site_id) REFERENCES seo.sites(id) ON DELETE CASCADE;


--
-- Name: rankings rankings_keyword_id_keywords_id_fkey; Type: FK CONSTRAINT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.rankings
    ADD CONSTRAINT rankings_keyword_id_keywords_id_fkey FOREIGN KEY (keyword_id) REFERENCES seo.keywords(id) ON DELETE CASCADE;


--
-- Name: url_rankings url_rankings_tracked_url_id_tracked_urls_id_fkey; Type: FK CONSTRAINT; Schema: seo; Owner: -
--

ALTER TABLE ONLY seo.url_rankings
    ADD CONSTRAINT url_rankings_tracked_url_id_tracked_urls_id_fkey FOREIGN KEY (tracked_url_id) REFERENCES seo.tracked_urls(id) ON DELETE CASCADE;


--
-- Name: ga_summary; Type: ROW SECURITY; Schema: marketing; Owner: -
--

ALTER TABLE marketing.ga_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: ga_totals; Type: ROW SECURITY; Schema: marketing; Owner: -
--

ALTER TABLE marketing.ga_totals ENABLE ROW LEVEL SECURITY;

--
-- Name: inquiries; Type: ROW SECURITY; Schema: marketing; Owner: -
--

ALTER TABLE marketing.inquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: keyword_details; Type: ROW SECURITY; Schema: marketing; Owner: -
--

ALTER TABLE marketing.keyword_details ENABLE ROW LEVEL SECURITY;

--
-- Name: keyword_reports; Type: ROW SECURITY; Schema: marketing; Owner: -
--

ALTER TABLE marketing.keyword_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: board_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_labels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_labels ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: dashboard_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dashboard_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_menu_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_menu_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: labels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_products ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: post_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

--
-- Name: keywords; Type: ROW SECURITY; Schema: seo; Owner: -
--

ALTER TABLE seo.keywords ENABLE ROW LEVEL SECURITY;

--
-- Name: rankings; Type: ROW SECURITY; Schema: seo; Owner: -
--

ALTER TABLE seo.rankings ENABLE ROW LEVEL SECURITY;

--
-- Name: sites; Type: ROW SECURITY; Schema: seo; Owner: -
--

ALTER TABLE seo.sites ENABLE ROW LEVEL SECURITY;

--
-- Name: tracked_urls; Type: ROW SECURITY; Schema: seo; Owner: -
--

ALTER TABLE seo.tracked_urls ENABLE ROW LEVEL SECURITY;

--
-- Name: url_rankings; Type: ROW SECURITY; Schema: seo; Owner: -
--

ALTER TABLE seo.url_rankings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict Krio4XgFDjwfLRUtWqKbFj49UtqecQphloFuFpzzUA7fZ7Sg2xcrWZNiDy2TSrD

