--
-- PostgreSQL database dump
--

\restrict Vc6GazbQUvNOGu2Wvan0dOniIg4NvtgRcg8cOlRWLbc4axPMVfYHcGWYFtQCArl

-- Dumped from database version 15.13 (8f9063c)
-- Dumped by pg_dump version 15.14 (Homebrew)

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
    owned_nfts jsonb DEFAULT '[]'::jsonb,
    image_url character varying(500),
    royalty_percentage numeric(5,2) DEFAULT 0.00 NOT NULL,
    CONSTRAINT valid_block_number CHECK ((block_number > 0)),
    CONSTRAINT valid_chain_id CHECK ((chain_id > 0)),
    CONSTRAINT valid_ethereum_address CHECK ((((collection_owner)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((token_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((router_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((strategy_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((royalties_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text) AND ((deployer_address)::text ~ '^0x[a-fA-F0-9]{40}$'::text))),
    CONSTRAINT valid_royalty_percentage CHECK (((royalty_percentage >= 0.00) AND (royalty_percentage <= 100.00))),
    CONSTRAINT valid_token_symbol CHECK (((token_symbol)::text ~ '^[A-Z0-9]{1,10}$'::text)),
    CONSTRAINT valid_tx_hash CHECK (((transaction_hash)::text ~ '^0x[a-fA-F0-9]{64}$'::text))
);


ALTER TABLE public.collections OWNER TO neondb_owner;

--
-- Name: COLUMN collections.owned_nfts; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.collections.owned_nfts IS 'JSON array of owned NFT token IDs. Format: [{"tokenId": "123", "purchasedAt": "2025-10-16T..."}, ...]';


--
-- Name: COLUMN collections.royalty_percentage; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.collections.royalty_percentage IS 'Royalty percentage (e.g., 3.00 for 3%)';


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
-- Name: collections id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.collections ALTER COLUMN id SET DEFAULT nextval('public.collections_id_seq'::regclass);


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
-- Name: idx_collections_data_freshness; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_data_freshness ON public.collections USING btree (opensea_data_updated_at DESC) WHERE (opensea_data_updated_at IS NOT NULL);


--
-- Name: INDEX idx_collections_data_freshness; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON INDEX public.idx_collections_data_freshness IS 'Speeds up queries checking data freshness across all collections';


--
-- Name: idx_collections_deployer_address; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_deployer_address ON public.collections USING btree (deployer_address, created_at DESC);


--
-- Name: INDEX idx_collections_deployer_address; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON INDEX public.idx_collections_deployer_address IS 'Optimizes creator dashboard queries by deployer address with chronological ordering';


--
-- Name: idx_collections_magiceden_cache; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_magiceden_cache ON public.collections USING btree (collection_owner, chain_id, opensea_data_updated_at DESC) WHERE (chain_id = 10143);


--
-- Name: INDEX idx_collections_magiceden_cache; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON INDEX public.idx_collections_magiceden_cache IS 'Optimizes Magic Eden data cache lookups by collection_owner and chain_id';


--
-- Name: idx_collections_opensea_slug; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_opensea_slug ON public.collections USING btree (opensea_slug);


--
-- Name: idx_collections_owned_nfts; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collections_owned_nfts ON public.collections USING gin (owned_nfts);


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
-- PostgreSQL database dump complete
--

\unrestrict Vc6GazbQUvNOGu2Wvan0dOniIg4NvtgRcg8cOlRWLbc4axPMVfYHcGWYFtQCArl

