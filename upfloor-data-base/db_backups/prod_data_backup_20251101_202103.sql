--
-- PostgreSQL database dump
--

\restrict w5OYTGJe2eh7eHzZOb4v1cVhFpZltODqtXv7TaHrDlGQlgBfXd4aZmnQLgsWyWc

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

--
-- Data for Name: collections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.collections (id, collection_name, collection_owner, chain_id, token_address, router_address, strategy_address, royalties_address, deployer_address, transaction_hash, block_number, token_symbol, collection_image, website, twitter, discord, telegram_id, opensea_slug, total_supply, listed_count, floor_price, market_cap, opensea_data_updated_at, created_at, updated_at, owned_nfts, image_url, royalty_percentage) FROM stdin;
\.


--
-- Name: collections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.collections_id_seq', 26, true);


--
-- PostgreSQL database dump complete
--

\unrestrict w5OYTGJe2eh7eHzZOb4v1cVhFpZltODqtXv7TaHrDlGQlgBfXd4aZmnQLgsWyWc

