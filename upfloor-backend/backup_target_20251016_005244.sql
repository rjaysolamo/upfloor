--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (8f9063c)
-- Dumped by pg_dump version 15.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: collections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.collections (
    id integer NOT NULL,
    collection_name character varying(255) NOT NULL,
    collection_owner character varying(42) NOT NULL,
    chain_id integer NOT NULL,
    token_address character varying(42) NOT NULL,
    router_address character varying(42) NOT NULL,
    strategy_address character varying(42) NOT NULL,
    royalties_address character varying(42) NOT NULL,
    deployer_address character varying(42) NOT NULL,
    transaction_hash character varying(66) NOT NULL,
    block_number bigint NOT NULL,
    token_symbol character varying(10) NOT NULL,
    collection_image bytea,
    website character varying(500),
    twitter character varying(100),
    discord character varying(500),
    telegram_id character varying(100),
    opensea_slug character varying(100),
    total_supply integer,
    listed_count integer,
    floor_price numeric(28,18),
    market_cap numeric(28,18),
    opensea_data_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_block_number CHECK ((block_number > 0)),
    CONSTRAINT valid_chain_id CHECK ((chain_id > 0)),
    CONSTRAINT valid_ethereum_address CHECK ((((collection_owner)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((token_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((router_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((strategy_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((royalties_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((deployer_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text))),
    CONSTRAINT valid_token_symbol CHECK (((token_symbol)::text ~ '^[A-Z0-9]{1,10}$'::text)),
    CONSTRAINT valid_tx_hash CHECK (((transaction_hash)::text ~ '^0x[a-fA-F0-9]{64}$'::text))
);


ALTER TABLE public.collections OWNER TO neondb_owner;

--
-- Name: collections_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.collections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.collections_id_seq OWNER TO neondb_owner;

--
-- Name: collections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.collections_id_seq OWNED BY public.collections.id;


--
-- Name: collections_with_chain_info; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.collections_with_chain_info AS
 SELECT c.id,
    c.collection_name,
    c.collection_owner,
    c.chain_id,
    c.token_address,
    c.router_address,
    c.strategy_address,
    c.royalties_address,
    c.deployer_address,
    c.transaction_hash,
    c.block_number,
    c.token_symbol,
    c.collection_image,
    c.website,
    c.twitter,
    c.discord,
    c.telegram_id,
    c.opensea_slug,
    c.total_supply,
    c.listed_count,
    c.floor_price,
    c.market_cap,
    c.opensea_data_updated_at,
    c.created_at,
    c.updated_at,
        CASE c.chain_id
            WHEN 1 THEN 'Ethereum Mainnet'::text
            WHEN 11155111 THEN 'Ethereum Sepolia Testnet'::text
            WHEN 137 THEN 'Polygon Mainnet'::text
            WHEN 10 THEN 'Optimism Mainnet'::text
            WHEN 42161 THEN 'Arbitrum One'::text
            WHEN 8453 THEN 'Base Mainnet'::text
            WHEN 10143 THEN 'Monad Testnet'::text
            WHEN 33139 THEN 'Apechain Mainnet'::text
            ELSE 'Unknown Network'::text
        END AS network_name,
        CASE c.chain_id
            WHEN 1 THEN 'https://etherscan.io'::text
            WHEN 11155111 THEN 'https://sepolia.etherscan.io'::text
            WHEN 137 THEN 'https://polygonscan.com'::text
            WHEN 10 THEN 'https://optimistic.etherscan.io'::text
            WHEN 42161 THEN 'https://arbiscan.io'::text
            WHEN 8453 THEN 'https://basescan.org'::text
            WHEN 10143 THEN 'https://testnet.monadexplorer.com'::text
            WHEN 33139 THEN 'https://apescan.io'::text
            ELSE NULL::text
        END AS explorer_base_url
   FROM public.collections c;


ALTER TABLE public.collections_with_chain_info OWNER TO neondb_owner;

--
-- Name: collections id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.collections ALTER COLUMN id SET DEFAULT nextval('public.collections_id_seq'::regclass);


--
-- Data for Name: collections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.collections (id, collection_name, collection_owner, chain_id, token_address, router_address, strategy_address, royalties_address, deployer_address, transaction_hash, block_number, token_symbol, collection_image, website, twitter, discord, telegram_id, opensea_slug, total_supply, listed_count, floor_price, market_cap, opensea_data_updated_at, created_at, updated_at) FROM stdin;
\.


--
-- Name: collections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.collections_id_seq', 1, false);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: idx_collections_chain_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_chain_id ON public.collections USING btree (chain_id);


--
-- Name: idx_collections_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_created_at ON public.collections USING btree (created_at);


--
-- Name: idx_collections_opensea_slug; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_opensea_slug ON public.collections USING btree (opensea_slug);


--
-- Name: idx_collections_owner; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_owner ON public.collections USING btree (collection_owner);


--
-- Name: idx_collections_token_address; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_token_address ON public.collections USING btree (token_address);


--
-- Name: idx_collections_token_symbol; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_token_symbol ON public.collections USING btree (token_symbol);


--
-- Name: idx_collections_tx_hash; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_tx_hash ON public.collections USING btree (transaction_hash);


--
-- Name: idx_collections_unique_deployment; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_collections_unique_deployment ON public.collections USING btree (transaction_hash, chain_id);


--
-- Name: idx_collections_unique_symbol; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_collections_unique_symbol ON public.collections USING btree (upper((token_symbol)::text));


--
-- Name: collections update_collections_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES  TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

