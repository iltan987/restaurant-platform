--
-- PostgreSQL database dump
--

\restrict XV8DrLvSlAn84R0hooNv4Grd1hKXVPUCE5uETtsPFivEjddIfGphJaHs6NOTjrM

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: DayOfWeek; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DayOfWeek" AS ENUM (
    'MON',
    'TUE',
    'WED',
    'THU',
    'FRI',
    'SAT',
    'SUN'
);


ALTER TYPE public."DayOfWeek" OWNER TO postgres;

--
-- Name: MediaType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MediaType" AS ENUM (
    'PHOTO',
    'VIDEO'
);


ALTER TYPE public."MediaType" OWNER TO postgres;

--
-- Name: OnboardingStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OnboardingStatus" AS ENUM (
    'IN_PROGRESS',
    'COMPLETED',
    'SKIPPED'
);


ALTER TYPE public."OnboardingStatus" OWNER TO postgres;

--
-- Name: RestaurantStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RestaurantStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public."RestaurantStatus" OWNER TO postgres;

--
-- Name: ServingUnit; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ServingUnit" AS ENUM (
    'GRAM',
    'KILOGRAM',
    'MILLILITER',
    'LITER',
    'PIECE',
    'PORTION'
);


ALTER TYPE public."ServingUnit" OWNER TO postgres;

--
-- Name: TableShape; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TableShape" AS ENUM (
    'SQUARE',
    'RECT',
    'ROUND'
);


ALTER TYPE public."TableShape" OWNER TO postgres;

--
-- Name: UnitPriceBasis; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UnitPriceBasis" AS ENUM (
    'AUTO',
    'HIDE',
    'PER_KG',
    'PER_100G',
    'PER_L',
    'PER_100ML',
    'PER_PIECE'
);


ALTER TYPE public."UnitPriceBasis" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _AllergenToMenuItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_AllergenToMenuItem" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_AllergenToMenuItem" OWNER TO postgres;

--
-- Name: _MenuItemToTag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_MenuItemToTag" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_MenuItemToTag" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: allergens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.allergens (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    label text NOT NULL,
    "isStandard" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.allergens OWNER TO postgres;

--
-- Name: areas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.areas (
    id text NOT NULL,
    "floorId" text NOT NULL,
    name text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    code text
);


ALTER TABLE public.areas OWNER TO postgres;

--
-- Name: availability_windows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.availability_windows (
    id text NOT NULL,
    "itemId" text NOT NULL,
    days public."DayOfWeek"[],
    "startMin" integer NOT NULL,
    "endMin" integer NOT NULL
);


ALTER TABLE public.availability_windows OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    name text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "isHidden" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: floors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.floors (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    name text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.floors OWNER TO postgres;

--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_assets (
    id text NOT NULL,
    "itemId" text NOT NULL,
    type public."MediaType" NOT NULL,
    "storageKey" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.media_assets OWNER TO postgres;

--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    "categoryId" text NOT NULL,
    name text NOT NULL,
    description text,
    "priceMinor" integer NOT NULL,
    "inStock" boolean DEFAULT true NOT NULL,
    calories integer,
    "servingAmount" numeric(65,30),
    "servingUnit" public."ServingUnit",
    "position" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "unitPriceBasis" public."UnitPriceBasis" DEFAULT 'AUTO'::public."UnitPriceBasis" NOT NULL
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: option_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.option_groups (
    id text NOT NULL,
    "itemId" text NOT NULL,
    name text NOT NULL,
    "minSelect" integer DEFAULT 0 NOT NULL,
    "maxSelect" integer,
    required boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.option_groups OWNER TO postgres;

--
-- Name: options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.options (
    id text NOT NULL,
    "groupId" text NOT NULL,
    name text NOT NULL,
    "priceDeltaMinor" integer DEFAULT 0 NOT NULL,
    "defaultSelected" boolean DEFAULT false NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.options OWNER TO postgres;

--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.restaurants (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    status public."RestaurantStatus" DEFAULT 'INACTIVE'::public."RestaurantStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "onboardingStatus" public."OnboardingStatus" DEFAULT 'IN_PROGRESS'::public."OnboardingStatus" NOT NULL
);


ALTER TABLE public.restaurants OWNER TO postgres;

--
-- Name: tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tables (
    id text NOT NULL,
    "areaId" text NOT NULL,
    label text NOT NULL,
    capacity integer,
    "positionX" double precision,
    "positionY" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    shape public."TableShape" DEFAULT 'SQUARE'::public."TableShape" NOT NULL
);


ALTER TABLE public.tables OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    label text NOT NULL,
    color text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- Data for Name: _AllergenToMenuItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_AllergenToMenuItem" ("A", "B") FROM stdin;
nhazzesxxknbqsh96yx0ecab	bhko8u6fuhpcd9f8wtsn0gfv
oionwtblce5ayivsu4heq6p1	bhko8u6fuhpcd9f8wtsn0gfv
ax891pgb4qare0yj9lo9kh30	gu1gp1m5qdciwh6ij8lkoixp
nhazzesxxknbqsh96yx0ecab	w3j1bgm9bvxo9sv7cfdkv60h
oionwtblce5ayivsu4heq6p1	w3j1bgm9bvxo9sv7cfdkv60h
nhazzesxxknbqsh96yx0ecab	hben05d0mmd1g2za9e3bp2zr
pyw0yozyivzatsndf3alog4w	hben05d0mmd1g2za9e3bp2zr
o26m38dwvrek35j3o3mny6jo	hben05d0mmd1g2za9e3bp2zr
oionwtblce5ayivsu4heq6p1	enlv094wsaw102ola6fi9m9r
nhazzesxxknbqsh96yx0ecab	q4cqzmnofal8kyl4au9hm71j
l1hynz528sz9g6kodxl3a5rl	p7nhvnrrj6mzqrjixoek2047
nhazzesxxknbqsh96yx0ecab	g571zvsnqfxgjf6oyik04cuu
pyw0yozyivzatsndf3alog4w	g571zvsnqfxgjf6oyik04cuu
oionwtblce5ayivsu4heq6p1	g571zvsnqfxgjf6oyik04cuu
nhazzesxxknbqsh96yx0ecab	fl66lgyafhn7kz31o7i3n4fm
oionwtblce5ayivsu4heq6p1	fl66lgyafhn7kz31o7i3n4fm
nhazzesxxknbqsh96yx0ecab	qe39a90fzh7djj4rvjabmrp2
oionwtblce5ayivsu4heq6p1	qe39a90fzh7djj4rvjabmrp2
nhazzesxxknbqsh96yx0ecab	fuf2s5nairfngtk3aqy5ez6h
oionwtblce5ayivsu4heq6p1	fuf2s5nairfngtk3aqy5ez6h
nhazzesxxknbqsh96yx0ecab	b1och91vf3o5ag1eqli6de53
oionwtblce5ayivsu4heq6p1	b1och91vf3o5ag1eqli6de53
ax891pgb4qare0yj9lo9kh30	b1och91vf3o5ag1eqli6de53
nhazzesxxknbqsh96yx0ecab	dimjl04asp41v68tcd5cb706
pyw0yozyivzatsndf3alog4w	dimjl04asp41v68tcd5cb706
nhazzesxxknbqsh96yx0ecab	ky4ddc2syprt8yg5v1fafs6o
nhazzesxxknbqsh96yx0ecab	ba9iffleeba5onhmrybui9k2
pyw0yozyivzatsndf3alog4w	ba9iffleeba5onhmrybui9k2
l1hynz528sz9g6kodxl3a5rl	ba9iffleeba5onhmrybui9k2
oionwtblce5ayivsu4heq6p1	ba9iffleeba5onhmrybui9k2
oionwtblce5ayivsu4heq6p1	qk7rs1rou1hknwajymt9bjs7
nhazzesxxknbqsh96yx0ecab	sffotzaqt2ngvvty7th51hze
oionwtblce5ayivsu4heq6p1	sffotzaqt2ngvvty7th51hze
cekwf8u4ida7v8wag4nwzwtm	sffotzaqt2ngvvty7th51hze
nhazzesxxknbqsh96yx0ecab	hb6lturb4v01hv96etnsypj7
pyw0yozyivzatsndf3alog4w	hb6lturb4v01hv96etnsypj7
oionwtblce5ayivsu4heq6p1	hb6lturb4v01hv96etnsypj7
oionwtblce5ayivsu4heq6p1	kmkoaf5dem5v7dulav2q1tmf
oionwtblce5ayivsu4heq6p1	ju5xyakfseavyvrb59gj305a
pyw0yozyivzatsndf3alog4w	e5avhm2dy01wuq366zpfxavr
oionwtblce5ayivsu4heq6p1	e5avhm2dy01wuq366zpfxavr
zv90ia7sv22l13pnn9270oxk	e5avhm2dy01wuq366zpfxavr
\.


--
-- Data for Name: _MenuItemToTag; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_MenuItemToTag" ("A", "B") FROM stdin;
e5avhm2dy01wuq366zpfxavr	zvutm3e4dulcw2ygc5thf74j
gu1gp1m5qdciwh6ij8lkoixp	zvutm3e4dulcw2ygc5thf74j
gu1gp1m5qdciwh6ij8lkoixp	w77sergobzd37mznu4o0auep
w3j1bgm9bvxo9sv7cfdkv60h	zvutm3e4dulcw2ygc5thf74j
enlv094wsaw102ola6fi9m9r	zvutm3e4dulcw2ygc5thf74j
enlv094wsaw102ola6fi9m9r	nwt4krildut13guk05grdnio
npbs7rzikey93qadpr8ci5db	w77sergobzd37mznu4o0auep
mvklgmmoc0qwyygyytlpuoru	zvutm3e4dulcw2ygc5thf74j
kd5dqc7p9sv93k6dkgqmy8hz	haf81q7g9vitjqp896re6et9
fl66lgyafhn7kz31o7i3n4fm	zvutm3e4dulcw2ygc5thf74j
ky4ddc2syprt8yg5v1fafs6o	w77sergobzd37mznu4o0auep
qk7rs1rou1hknwajymt9bjs7	zvutm3e4dulcw2ygc5thf74j
sffotzaqt2ngvvty7th51hze	haf81q7g9vitjqp896re6et9
kmkoaf5dem5v7dulav2q1tmf	zvutm3e4dulcw2ygc5thf74j
zq9p4sdf2ggj3yv2nerjg8j2	w77sergobzd37mznu4o0auep
kj6lwlrg9w6ip2jv1v4kp6ql	w77sergobzd37mznu4o0auep
kj6lwlrg9w6ip2jv1v4kp6ql	vxqxfhn9ya09s4un8ns0b77b
ffc3lkul1texpru7gpjswa9i	w77sergobzd37mznu4o0auep
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
8779c248-7635-4c81-ac1f-d2865b10bdb4	a39819d4761237f87311587965e8992157a763fb4f29682d2c94c740fd113f5a	2026-06-05 13:04:04.593478+00	20260530070114_add_restaurant	\N	\N	2026-06-05 13:04:04.582014+00	1
b5762ac9-70f5-4951-989c-f7abd79839d3	248a76c2c1fa98d43594179e4b418966700fb7c3040961d6d4688dc8bcc61f9c	2026-06-05 13:04:04.630737+00	20260605125428_onboarding_floors_areas_tables	\N	\N	2026-06-05 13:04:04.595639+00	1
09dcf8c8-4b1d-4fed-9e4e-942ddf3c71ea	c377476e044ea17a9ccdd8fbc666fa1a39833e2340294ec2fd098d3ac24b1105	2026-06-08 11:18:43.544431+00	20260608111843_area_code_prefix	\N	\N	2026-06-08 11:18:43.538615+00	1
b167e297-2cb7-4efb-a79f-f8bc7259c0c7	73285ab432700e7ae038c35cad677c8dd4acf385dbad45cd03ce207e52aa4bc4	2026-06-08 12:58:51.295599+00	20260608125851_add_table_shape	\N	\N	2026-06-08 12:58:51.287061+00	1
8ad49e8a-44f1-4a44-b7cf-1a2220d2f7b8	487dac9415f213ee5b8a583f3ca2f194a5561ea69cfc60129bc7cdd3ba9e5953	2026-06-10 12:06:00.348752+00	20260610120600_add_menu_domain	\N	\N	2026-06-10 12:06:00.234461+00	1
39972065-943b-4cfc-b834-fd512ea21af9	a08a6d2e9721e2e6f902eb94b7f821071aba11d7a7fdd7e72fbe5e4719871b3b	2026-06-10 14:41:51.619049+00	20260610130000_backfill_standard_allergens	\N	\N	2026-06-10 14:41:51.609455+00	1
ee62a252-c9b0-4d9c-9301-e842c9573cb5	36b1d64cc5ecf90b92ac42bffb2c3197696bb352ec69a713402205a73247eb9c	2026-06-11 11:14:10.257307+00	20260611111410_add_unit_price_basis	\N	\N	2026-06-11 11:14:10.240051+00	1
\.


--
-- Data for Name: allergens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.allergens (id, "restaurantId", label, "isStandard", "createdAt", "updatedAt") FROM stdin;
nhazzesxxknbqsh96yx0ecab	btaafguqhzqlmr9wwzc37c7f	Gluten içeren tahıllar	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
vr1jbnhskuylxfclt8foth3e	btaafguqhzqlmr9wwzc37c7f	Kabuklu deniz ürünleri	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
pyw0yozyivzatsndf3alog4w	btaafguqhzqlmr9wwzc37c7f	Yumurta	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
l1hynz528sz9g6kodxl3a5rl	btaafguqhzqlmr9wwzc37c7f	Balık	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
n13ucqpbq7ee6f9l1wn8hex7	btaafguqhzqlmr9wwzc37c7f	Yer fıstığı	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
vk77vg0ixf84u4zb2cldhaul	btaafguqhzqlmr9wwzc37c7f	Soya	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
oionwtblce5ayivsu4heq6p1	btaafguqhzqlmr9wwzc37c7f	Süt	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
cekwf8u4ida7v8wag4nwzwtm	btaafguqhzqlmr9wwzc37c7f	Sert kabuklu yemişler	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
ssh66u4a88j3v3menz7dhu5v	btaafguqhzqlmr9wwzc37c7f	Kereviz	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
ppbxu561a6x5g315ss7p9i8y	btaafguqhzqlmr9wwzc37c7f	Hardal	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
ax891pgb4qare0yj9lo9kh30	btaafguqhzqlmr9wwzc37c7f	Susam	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
pz45vjw6ubscq42ha2ma66xq	btaafguqhzqlmr9wwzc37c7f	Kükürt dioksit ve sülfitler	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
n23dtmqlvymffxbvhp2zuoiw	btaafguqhzqlmr9wwzc37c7f	Acı bakla (lüpen)	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
o26m38dwvrek35j3o3mny6jo	btaafguqhzqlmr9wwzc37c7f	Yumuşakçalar	t	2026-06-11 08:01:53.055	2026-06-11 08:01:53.055
zv90ia7sv22l13pnn9270oxk	btaafguqhzqlmr9wwzc37c7f	Domates	f	2026-06-11 09:07:08.696	2026-06-11 09:07:08.696
\.


--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.areas (id, "floorId", name, "position", "createdAt", "updatedAt", code) FROM stdin;
mzweit6dtvqz31203w005po4	yzla4a3sahxljhxths1c23lo	Genel	0	2026-06-11 08:01:53.05	2026-06-11 08:01:53.05	\N
\.


--
-- Data for Name: availability_windows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.availability_windows (id, "itemId", days, "startMin", "endMin") FROM stdin;
mnqo3s9mu7d5sgwulqbgorft	bhko8u6fuhpcd9f8wtsn0gfv	{MON,TUE,WED,THU,FRI,SAT,SUN}	360	660
pj0l7trjix1egixbp1rtbr9u	e5avhm2dy01wuq366zpfxavr	{MON,TUE,WED,THU,FRI,SAT,SUN}	360	660
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, "restaurantId", name, "position", "isHidden", "createdAt", "updatedAt") FROM stdin;
achhtqm7tp1h5c4kmt36w7z1	btaafguqhzqlmr9wwzc37c7f	Kahvaltı	0	f	2026-06-11 10:18:08.401	2026-06-11 10:18:08.401
yz2g2bjo1sttw89kjad4m4or	btaafguqhzqlmr9wwzc37c7f	Başlangıçlar	1	f	2026-06-11 10:18:08.434	2026-06-11 10:18:08.434
wrjxuivo0x1xafxpa9v56pk7	btaafguqhzqlmr9wwzc37c7f	Çorbalar	2	f	2026-06-11 10:18:08.468	2026-06-11 10:18:08.468
kdrkcvdxd5y3v7ertei6n5m5	btaafguqhzqlmr9wwzc37c7f	Ana Yemekler	3	f	2026-06-11 10:18:08.483	2026-06-11 10:18:08.483
x9koxg0nmm9moj8mfenez0mz	btaafguqhzqlmr9wwzc37c7f	Pizzalar	4	f	2026-06-11 10:18:08.509	2026-06-11 10:18:08.509
tnzxf2l43vbrkvy5skc6dal4	btaafguqhzqlmr9wwzc37c7f	Burgerler	5	f	2026-06-11 10:18:08.535	2026-06-11 10:18:08.535
w4v1u0ia1tqgtawyw7mrwos9	btaafguqhzqlmr9wwzc37c7f	Salatalar	6	f	2026-06-11 10:18:08.559	2026-06-11 10:18:08.559
qufvn2iqk93va7oojbhvrfqp	btaafguqhzqlmr9wwzc37c7f	Tatlılar	7	f	2026-06-11 10:18:08.571	2026-06-11 10:18:08.571
v51ily1o9mx6ku6vv8x6ylwo	btaafguqhzqlmr9wwzc37c7f	İçecekler	8	f	2026-06-11 10:18:08.586	2026-06-11 10:18:08.586
\.


--
-- Data for Name: floors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.floors (id, "restaurantId", name, "position", "createdAt", "updatedAt") FROM stdin;
yzla4a3sahxljhxths1c23lo	btaafguqhzqlmr9wwzc37c7f	Zemin Kat	0	2026-06-11 08:01:53.048	2026-06-11 08:01:53.048
\.


--
-- Data for Name: media_assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media_assets (id, "itemId", type, "storageKey", "mimeType", "sizeBytes", "position", "createdAt") FROM stdin;
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, "restaurantId", "categoryId", name, description, "priceMinor", "inStock", calories, "servingAmount", "servingUnit", "position", "createdAt", "updatedAt", "unitPriceBasis") FROM stdin;
npbs7rzikey93qadpr8ci5db	btaafguqhzqlmr9wwzc37c7f	wrjxuivo0x1xafxpa9v56pk7	Mercimek Çorbası	Geleneksel kırmızı mercimek çorbası, limon ile.	8500	t	220	300.000000000000000000000000000000	MILLILITER	0	2026-06-11 10:18:08.472	2026-06-11 12:01:07.327	AUTO
bhko8u6fuhpcd9f8wtsn0gfv	btaafguqhzqlmr9wwzc37c7f	achhtqm7tp1h5c4kmt36w7z1	Serpme Kahvaltı (2 Kişilik)	Zengin kahvaltı tabağı: peynir çeşitleri, zeytin, bal-kaymak, reçel, domates, salatalık ve sıcak ekmek.	45000	t	\N	2.000000000000000000000000000000	PORTION	0	2026-06-11 10:18:08.416	2026-06-11 10:18:08.416	AUTO
gu1gp1m5qdciwh6ij8lkoixp	btaafguqhzqlmr9wwzc37c7f	yz2g2bjo1sttw89kjad4m4or	Humus	Nohut püresi, tahin, zeytinyağı ve limon ile.	12500	t	320	\N	\N	0	2026-06-11 10:18:08.439	2026-06-11 10:18:08.439	AUTO
w3j1bgm9bvxo9sv7cfdkv60h	btaafguqhzqlmr9wwzc37c7f	yz2g2bjo1sttw89kjad4m4or	Sigara Böreği	Çıtır yufka içinde beyaz peynir (6 adet).	11000	t	\N	6.000000000000000000000000000000	PIECE	1	2026-06-11 10:18:08.447	2026-06-11 10:18:08.447	AUTO
hben05d0mmd1g2za9e3bp2zr	btaafguqhzqlmr9wwzc37c7f	yz2g2bjo1sttw89kjad4m4or	Kalamar Tava	Çıtır kalamar halkaları, tartar sos ile.	18500	t	410	\N	\N	2	2026-06-11 10:18:08.455	2026-06-11 10:18:08.455	AUTO
enlv094wsaw102ola6fi9m9r	btaafguqhzqlmr9wwzc37c7f	yz2g2bjo1sttw89kjad4m4or	Atom	Süzme yoğurt, közlenmiş acı biber ve sarımsak.	9500	t	\N	\N	\N	3	2026-06-11 10:18:08.462	2026-06-11 10:18:08.462	AUTO
mvklgmmoc0qwyygyytlpuoru	btaafguqhzqlmr9wwzc37c7f	wrjxuivo0x1xafxpa9v56pk7	Ezogelin Çorbası	Bulgur ve kırmızı mercimekli, naneli.	8500	t	\N	300.000000000000000000000000000000	MILLILITER	1	2026-06-11 10:18:08.479	2026-06-11 10:18:08.479	AUTO
q4cqzmnofal8kyl4au9hm71j	btaafguqhzqlmr9wwzc37c7f	kdrkcvdxd5y3v7ertei6n5m5	Izgara Köfte	El yapımı dana köfte, pilav ve közlenmiş sebze ile.	24500	t	680	220.000000000000000000000000000000	GRAM	0	2026-06-11 10:18:08.487	2026-06-11 10:18:08.487	AUTO
qux578asmeaylifkwlwyek4a	btaafguqhzqlmr9wwzc37c7f	kdrkcvdxd5y3v7ertei6n5m5	Tavuk Şiş	Marine edilmiş tavuk şiş, bulgur pilavı ile.	21500	t	540	200.000000000000000000000000000000	GRAM	1	2026-06-11 10:18:08.491	2026-06-11 10:18:08.491	AUTO
kd5dqc7p9sv93k6dkgqmy8hz	btaafguqhzqlmr9wwzc37c7f	kdrkcvdxd5y3v7ertei6n5m5	Kuzu Pirzola	Izgara kuzu pirzola (4 adet), patates ve roka ile.	38500	t	720	4.000000000000000000000000000000	PIECE	2	2026-06-11 10:18:08.495	2026-06-11 10:18:08.495	AUTO
p7nhvnrrj6mzqrjixoek2047	btaafguqhzqlmr9wwzc37c7f	kdrkcvdxd5y3v7ertei6n5m5	Levrek Izgara	Günün taze levreği, mevsim yeşillikleri ile.	32000	t	430	\N	\N	3	2026-06-11 10:18:08.5	2026-06-11 10:18:08.5	AUTO
g571zvsnqfxgjf6oyik04cuu	btaafguqhzqlmr9wwzc37c7f	kdrkcvdxd5y3v7ertei6n5m5	Mantı	El açması mantı, sarımsaklı yoğurt ve naneli tereyağı.	19500	f	\N	\N	\N	4	2026-06-11 10:18:08.505	2026-06-11 10:18:08.505	AUTO
fl66lgyafhn7kz31o7i3n4fm	btaafguqhzqlmr9wwzc37c7f	x9koxg0nmm9moj8mfenez0mz	Margarita	Domates sosu, mozzarella ve taze fesleğen.	18000	t	\N	\N	\N	0	2026-06-11 10:18:08.514	2026-06-11 10:18:08.514	AUTO
qe39a90fzh7djj4rvjabmrp2	btaafguqhzqlmr9wwzc37c7f	x9koxg0nmm9moj8mfenez0mz	Sucuklu Pizza	Bol sucuk ve kaşar peyniri.	21000	t	\N	\N	\N	1	2026-06-11 10:18:08.523	2026-06-11 10:18:08.523	AUTO
fuf2s5nairfngtk3aqy5ez6h	btaafguqhzqlmr9wwzc37c7f	x9koxg0nmm9moj8mfenez0mz	Karışık Pizza	Sucuk, sosis, mantar, biber ve mısır.	22500	t	\N	\N	\N	2	2026-06-11 10:18:08.53	2026-06-11 10:18:08.53	AUTO
b1och91vf3o5ag1eqli6de53	btaafguqhzqlmr9wwzc37c7f	tnzxf2l43vbrkvy5skc6dal4	Klasik Burger	180gr dana köftesi, cheddar, marul ve domates.	19500	t	750	\N	\N	0	2026-06-11 10:18:08.54	2026-06-11 10:18:08.54	AUTO
dimjl04asp41v68tcd5cb706	btaafguqhzqlmr9wwzc37c7f	tnzxf2l43vbrkvy5skc6dal4	Tavuk Burger	Çıtır tavuk göğsü, ranch sos ve turşu.	17500	t	\N	\N	\N	1	2026-06-11 10:18:08.548	2026-06-11 10:18:08.548	AUTO
ky4ddc2syprt8yg5v1fafs6o	btaafguqhzqlmr9wwzc37c7f	tnzxf2l43vbrkvy5skc6dal4	Vegan Burger	Nohut köftesi, avokado ve karamelize soğan.	18500	t	520	\N	\N	2	2026-06-11 10:18:08.554	2026-06-11 10:18:08.554	AUTO
ba9iffleeba5onhmrybui9k2	btaafguqhzqlmr9wwzc37c7f	w4v1u0ia1tqgtawyw7mrwos9	Sezar Salata	Marul, ızgara tavuk, parmesan ve kruton.	16500	t	380	\N	\N	0	2026-06-11 10:18:08.562	2026-06-11 10:18:08.562	AUTO
qk7rs1rou1hknwajymt9bjs7	btaafguqhzqlmr9wwzc37c7f	w4v1u0ia1tqgtawyw7mrwos9	Akdeniz Salata	Mevsim yeşillikleri, zeytin ve beyaz peynir.	13500	t	\N	\N	\N	1	2026-06-11 10:18:08.567	2026-06-11 10:18:08.567	AUTO
sffotzaqt2ngvvty7th51hze	btaafguqhzqlmr9wwzc37c7f	qufvn2iqk93va7oojbhvrfqp	Künefe	Tel kadayıf, peynir, şerbet ve antep fıstığı.	14500	t	560	\N	\N	0	2026-06-11 10:18:08.574	2026-06-11 10:18:08.574	AUTO
hb6lturb4v01hv96etnsypj7	btaafguqhzqlmr9wwzc37c7f	qufvn2iqk93va7oojbhvrfqp	Çikolatalı Sufle	Akışkan sıcak çikolatalı sufle, vanilyalı dondurma ile.	13500	t	480	\N	\N	1	2026-06-11 10:18:08.579	2026-06-11 10:18:08.579	AUTO
kmkoaf5dem5v7dulav2q1tmf	btaafguqhzqlmr9wwzc37c7f	qufvn2iqk93va7oojbhvrfqp	Fırın Sütlaç	Geleneksel fırınlanmış sütlaç.	9500	t	290	\N	\N	2	2026-06-11 10:18:08.582	2026-06-11 10:18:08.582	AUTO
ju5xyakfseavyvrb59gj305a	btaafguqhzqlmr9wwzc37c7f	v51ily1o9mx6ku6vv8x6ylwo	Ayran	Ev yapımı köpüklü ayran.	3500	t	\N	300.000000000000000000000000000000	MILLILITER	0	2026-06-11 10:18:08.588	2026-06-11 10:18:08.588	AUTO
zq9p4sdf2ggj3yv2nerjg8j2	btaafguqhzqlmr9wwzc37c7f	v51ily1o9mx6ku6vv8x6ylwo	Türk Kahvesi	Geleneksel köpüklü Türk kahvesi.	5500	t	\N	80.000000000000000000000000000000	MILLILITER	1	2026-06-11 10:18:08.593	2026-06-11 10:18:08.593	AUTO
kj6lwlrg9w6ip2jv1v4kp6ql	btaafguqhzqlmr9wwzc37c7f	v51ily1o9mx6ku6vv8x6ylwo	Taze Sıkılmış Portakal Suyu	Günlük taze sıkılmış portakal.	7500	t	\N	300.000000000000000000000000000000	MILLILITER	2	2026-06-11 10:18:08.597	2026-06-11 10:18:08.597	AUTO
ffc3lkul1texpru7gpjswa9i	btaafguqhzqlmr9wwzc37c7f	v51ily1o9mx6ku6vv8x6ylwo	Naneli Limonata	Ev yapımı naneli limonata.	6500	t	\N	330.000000000000000000000000000000	MILLILITER	3	2026-06-11 10:18:08.602	2026-06-11 10:18:08.602	AUTO
e5avhm2dy01wuq366zpfxavr	btaafguqhzqlmr9wwzc37c7f	achhtqm7tp1h5c4kmt36w7z1	Menemen	Tereyağında domates, biber ve yumurta.	12500	t	360	\N	\N	1	2026-06-11 10:18:08.427	2026-06-11 10:19:59.619	AUTO
\.


--
-- Data for Name: option_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.option_groups (id, "itemId", name, "minSelect", "maxSelect", required, "position") FROM stdin;
pq4usdpe863jpx2ozbgxkq9q	fl66lgyafhn7kz31o7i3n4fm	Boyut	1	1	t	0
h7rm87y7r0s7j7q6ckvfj6x7	qe39a90fzh7djj4rvjabmrp2	Boyut	1	1	t	0
owb8tt7i80qe6ubtg0gq0fbb	fuf2s5nairfngtk3aqy5ez6h	Boyut	1	1	t	0
d163zj4i8yfizj47hxjoya4t	b1och91vf3o5ag1eqli6de53	Pişme Derecesi	1	1	t	0
tncesqzncung6yomkgkc1n6f	b1och91vf3o5ag1eqli6de53	Ekstralar	0	\N	f	1
oyw1lrzatyfc3ldpc54rcirv	dimjl04asp41v68tcd5cb706	Ekstralar	0	\N	f	0
bnoecx66ezvtkaewflopejkf	fl66lgyafhn7kz31o7i3n4fm	Ekstra Malzemeler	0	\N	f	1
hzx737d4z3qfgskbrsuff5y3	qe39a90fzh7djj4rvjabmrp2	Ekstra Malzemeler	0	\N	f	1
zsoxbdtfy8djkvohggdq05e5	fuf2s5nairfngtk3aqy5ez6h	Ekstra Malzemeler	0	\N	f	1
h42pi2kjd01l3ncotojb5nt7	q4cqzmnofal8kyl4au9hm71j	Soslar	0	\N	f	0
efmxvu2nt7w1rdd5oc6l3655	qux578asmeaylifkwlwyek4a	Soslar	0	\N	f	0
trwz0ev5q29hevefh2zkq6i6	p7nhvnrrj6mzqrjixoek2047	Soslar	0	\N	f	0
ckhfpzacd2o8cjvmxl5vsllj	g571zvsnqfxgjf6oyik04cuu	Soslar	0	\N	f	0
tbxvui09k88ce6pcz2mm34nf	ba9iffleeba5onhmrybui9k2	Ekstra Protein	0	1	f	0
ealcoipnclbasfqsjxm3el5f	qk7rs1rou1hknwajymt9bjs7	Ekstra Protein	0	1	f	0
b9py8e4cfb0t5juwlluxm9vs	zq9p4sdf2ggj3yv2nerjg8j2	Şeker	1	1	t	0
jmpw2l08k3l4i07f2duk0csz	q4cqzmnofal8kyl4au9hm71j	Yanında	0	2	f	1
sa27sai3nwu1m29ux1bcytk7	qux578asmeaylifkwlwyek4a	Yanında	0	2	f	1
megrqjdywlu798drxlmi9u1h	kd5dqc7p9sv93k6dkgqmy8hz	Yanında	0	2	f	0
mx8s2u8q20vi8m6rwd5ozfp8	npbs7rzikey93qadpr8ci5db	Boy	1	1	t	0
\.


--
-- Data for Name: options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.options (id, "groupId", name, "priceDeltaMinor", "defaultSelected", "isAvailable", "position") FROM stdin;
qqquqylu847845f7axpt6ruo	pq4usdpe863jpx2ozbgxkq9q	Orta (30cm)	0	t	t	0
lwapqwog6wkrg4e4vo3npqwo	pq4usdpe863jpx2ozbgxkq9q	Büyük (40cm)	4000	f	t	1
g2koyl4mlfec4ru5ndbmk3lv	h7rm87y7r0s7j7q6ckvfj6x7	Orta (30cm)	0	t	t	0
f65qj1gltvyr5wwtvxaapc51	h7rm87y7r0s7j7q6ckvfj6x7	Büyük (40cm)	4000	f	t	1
c3kzbkz9gmfecjv8ubqms8ia	owb8tt7i80qe6ubtg0gq0fbb	Orta (30cm)	0	t	t	0
uhab6bouyf3flg5yn8ae8qot	owb8tt7i80qe6ubtg0gq0fbb	Büyük (40cm)	4000	f	t	1
rxkzsjr2t0511q4kuqmxsd84	d163zj4i8yfizj47hxjoya4t	Az pişmiş	0	f	t	0
kmsi9b3wh57n4zum7f8owtdu	d163zj4i8yfizj47hxjoya4t	Orta	0	t	t	1
kx0ov55ggj3tovw8b8kttl2t	d163zj4i8yfizj47hxjoya4t	İyi pişmiş	0	f	t	2
cy9c88d6k6b8xs42e9c8043d	tncesqzncung6yomkgkc1n6f	Ekstra Cheddar	1500	f	t	0
hu5199kc7ckw8lgeympwkbwc	tncesqzncung6yomkgkc1n6f	Dana Bacon	2500	f	t	1
lk0p3qh9o4stff49k5o7s3z9	tncesqzncung6yomkgkc1n6f	Karamelize Soğan	1000	f	t	2
gtfai5nn5txbpldjhknoz1ur	oyw1lrzatyfc3ldpc54rcirv	Ekstra Cheddar	1500	f	t	0
eglivag0tfvnzo7jatb0bf6k	oyw1lrzatyfc3ldpc54rcirv	Dana Bacon	2500	f	t	1
dep9t8z10f5qk95kytcbz99l	oyw1lrzatyfc3ldpc54rcirv	Karamelize Soğan	1000	f	t	2
zm6qj59ngomipw0vj7ilt350	tncesqzncung6yomkgkc1n6f	Cheddar peyniri	2500	f	t	3
nznf3bpgvfgdfzezwn5lh24o	tncesqzncung6yomkgkc1n6f	Dana bacon	4000	f	t	4
v40r7h8o4a46vv1a8phu194z	tncesqzncung6yomkgkc1n6f	Karamelize soğan	2000	f	t	5
wk12n1rasgcadjrxz7fmeeqr	tncesqzncung6yomkgkc1n6f	Jalapeño	1500	f	t	6
e4k2fglvxwyw95yo6ckdyf8c	tncesqzncung6yomkgkc1n6f	Ekstra köfte	6000	f	t	7
u3r2wo8ov5v0k90zje7u7zu3	oyw1lrzatyfc3ldpc54rcirv	Cheddar peyniri	2500	f	t	3
tyi23gvoyc8ol55et06txgy2	oyw1lrzatyfc3ldpc54rcirv	Dana bacon	4000	f	t	4
bnqikv9jxm8m7e16zo03y0p1	oyw1lrzatyfc3ldpc54rcirv	Karamelize soğan	2000	f	t	5
t3xws09r6n17kgj0smbiiqc8	oyw1lrzatyfc3ldpc54rcirv	Jalapeño	1500	f	t	6
yjhlr1v6obla9vzwooftkn9e	oyw1lrzatyfc3ldpc54rcirv	Ekstra köfte	6000	f	t	7
b2x4idogh87mtvpjajdpm5uk	bnoecx66ezvtkaewflopejkf	Ekstra peynir	3000	f	t	0
dbvdvt91csnopu2fdnyahb8h	bnoecx66ezvtkaewflopejkf	Mantar	2000	f	t	1
ap5xdv766hyqck6ucneupo2t	bnoecx66ezvtkaewflopejkf	Sucuk	3500	f	t	2
uwnfn8zxibv97vuyq1ftqwn0	bnoecx66ezvtkaewflopejkf	Zeytin	1500	f	t	3
bw2sef1lr133qys105r3qkwl	bnoecx66ezvtkaewflopejkf	Jalapeño	1500	f	t	4
rv3gzyeh3zb08jfowqkm4ow2	bnoecx66ezvtkaewflopejkf	Mısır	1500	f	t	5
wno3j5a4ucrco3nehxtctkri	hzx737d4z3qfgskbrsuff5y3	Ekstra peynir	3000	f	t	0
rrg8j9lk44n2hp7uz9781ked	hzx737d4z3qfgskbrsuff5y3	Mantar	2000	f	t	1
gm1ckf50e2bwgfwcpgfoomdl	hzx737d4z3qfgskbrsuff5y3	Sucuk	3500	f	t	2
msns13a5syliw0a5f8kc01z9	hzx737d4z3qfgskbrsuff5y3	Zeytin	1500	f	t	3
rikcp4fa5kv39yo0n5y27zkl	hzx737d4z3qfgskbrsuff5y3	Jalapeño	1500	f	t	4
u857agvpawxuo5j8pnxqi88j	hzx737d4z3qfgskbrsuff5y3	Mısır	1500	f	t	5
am1cq7nuljaru9vjaf2m8crs	zsoxbdtfy8djkvohggdq05e5	Ekstra peynir	3000	f	t	0
d2a9kv2t6lne4qo2g2o17z5q	zsoxbdtfy8djkvohggdq05e5	Mantar	2000	f	t	1
j0x3d60cr8cjpazfamm167qm	zsoxbdtfy8djkvohggdq05e5	Sucuk	3500	f	t	2
mo1y1ma5xxih19i9pu1dyxzp	zsoxbdtfy8djkvohggdq05e5	Zeytin	1500	f	t	3
oztgv01o5zm2fzytzsd5y0hz	zsoxbdtfy8djkvohggdq05e5	Jalapeño	1500	f	t	4
mvm2fqdm6brjqfzr0f8j0nn5	zsoxbdtfy8djkvohggdq05e5	Mısır	1500	f	t	5
r74xk3ai8v6dqlg70jo53o66	h42pi2kjd01l3ncotojb5nt7	Acı sos	0	f	t	0
cj7z5nt3gihoe0wz1vvtg61r	h42pi2kjd01l3ncotojb5nt7	Sarımsaklı yoğurt	0	f	t	1
tougnkcdseebmgp8x6lu56qk	h42pi2kjd01l3ncotojb5nt7	Barbekü sos	1000	f	t	2
qo8lzcihvgnr7jrdksdmmmhx	h42pi2kjd01l3ncotojb5nt7	Ranch sos	1000	f	t	3
hyiaa363ao25whsf9db1nvud	jmpw2l08k3l4i07f2duk0csz	Pirinç pilavı	2500	f	t	0
rwlpqfcmevab1lt0esn4hdvc	jmpw2l08k3l4i07f2duk0csz	Elma dilim patates	2500	f	t	1
fdaekj74dytrkyfc7j4i2y33	jmpw2l08k3l4i07f2duk0csz	Bulgur pilavı	2000	f	t	2
ejcwifod1dzrabflej1yvyxx	jmpw2l08k3l4i07f2duk0csz	Közlenmiş sebze	3000	f	t	3
nssr4xtgb1vnl5rs26a3szev	jmpw2l08k3l4i07f2duk0csz	Mevsim salata	3000	f	t	4
ea9s7yhgzdsu6fbx58q1xpzy	efmxvu2nt7w1rdd5oc6l3655	Acı sos	0	f	t	0
tcl61xm4jwryy7a1qfbm1s4g	efmxvu2nt7w1rdd5oc6l3655	Sarımsaklı yoğurt	0	f	t	1
siwdnfn7up8cpka1tpnjxf08	efmxvu2nt7w1rdd5oc6l3655	Barbekü sos	1000	f	t	2
mpkjqsj06znvs1j685tgv08o	efmxvu2nt7w1rdd5oc6l3655	Ranch sos	1000	f	t	3
evhxcu418m083qnbwp49nnzo	sa27sai3nwu1m29ux1bcytk7	Pirinç pilavı	2500	f	t	0
y7ovtf8xe7deutzwpaszgg3l	sa27sai3nwu1m29ux1bcytk7	Elma dilim patates	2500	f	t	1
h0g8o1uwvfn2vec76eoe0974	sa27sai3nwu1m29ux1bcytk7	Bulgur pilavı	2000	f	t	2
egswl1tb0vku782py3rb0nxt	sa27sai3nwu1m29ux1bcytk7	Közlenmiş sebze	3000	f	t	3
ygwy16wzhs38hbywf479w6m7	sa27sai3nwu1m29ux1bcytk7	Mevsim salata	3000	f	t	4
egcoe5qoqwu5oj6o25yzk7kr	megrqjdywlu798drxlmi9u1h	Pirinç pilavı	2500	f	t	0
i3yxrf36r7uz19wemto74q1u	megrqjdywlu798drxlmi9u1h	Elma dilim patates	2500	f	t	1
t43jc7gw1err1zfeaku1mxg8	megrqjdywlu798drxlmi9u1h	Bulgur pilavı	2000	f	t	2
v22plfpe4v8jdfjev1glm035	megrqjdywlu798drxlmi9u1h	Közlenmiş sebze	3000	f	t	3
s60w6xomt3gh278qxm77x8c5	megrqjdywlu798drxlmi9u1h	Mevsim salata	3000	f	t	4
zyf1ibvehqu95qph7wtx2aw5	trwz0ev5q29hevefh2zkq6i6	Acı sos	0	f	t	0
kv8bqyqrd4ic2kyaliode2sd	trwz0ev5q29hevefh2zkq6i6	Sarımsaklı yoğurt	0	f	t	1
jjtu72q5wjaw3102f0bttlw3	trwz0ev5q29hevefh2zkq6i6	Barbekü sos	1000	f	t	2
n0aoui5449svykrp2o78rdk0	trwz0ev5q29hevefh2zkq6i6	Ranch sos	1000	f	t	3
iaiyk8qnuw60y449i37qeuy0	ckhfpzacd2o8cjvmxl5vsllj	Acı sos	0	f	t	0
mqhupytmzy1fs29q6evpolzf	ckhfpzacd2o8cjvmxl5vsllj	Sarımsaklı yoğurt	0	f	t	1
hlfob8ia7m58sln5tvzn2h06	ckhfpzacd2o8cjvmxl5vsllj	Barbekü sos	1000	f	t	2
m67rday8xskfstpocwc7tbhj	ckhfpzacd2o8cjvmxl5vsllj	Ranch sos	1000	f	t	3
bvflqn6ngwegjq7lvhn1a4hx	tbxvui09k88ce6pcz2mm34nf	Izgara tavuk	4500	f	t	0
wkt2lquwvmbncu5uq6nrnhp5	tbxvui09k88ce6pcz2mm34nf	Somon	7500	f	t	1
vlaw55xmrm6hmp7itixc4w24	tbxvui09k88ce6pcz2mm34nf	Köfte	4000	f	t	2
djzg4o2wcm5zaski4sm9vlw9	ealcoipnclbasfqsjxm3el5f	Izgara tavuk	4500	f	t	0
b52wfg8jact1poq7jh8g35ef	ealcoipnclbasfqsjxm3el5f	Somon	7500	f	t	1
abfly5mhuj9ivf9dcno0vpfy	ealcoipnclbasfqsjxm3el5f	Köfte	4000	f	t	2
z410g3apanhpbrcf82zrb2z0	b9py8e4cfb0t5juwlluxm9vs	Sade	0	t	t	0
a0m23aj922nymcqni6nmib05	b9py8e4cfb0t5juwlluxm9vs	Az şekerli	0	f	t	1
g0ecw0a6fqattkic6th03up3	b9py8e4cfb0t5juwlluxm9vs	Orta	0	f	t	2
st2v1kc0wz0flpewksn3jkva	b9py8e4cfb0t5juwlluxm9vs	Çok şekerli	0	f	t	3
xeenz7vpydpqmgir4v9mcm03	mx8s2u8q20vi8m6rwd5ozfp8	Az	0	f	t	0
els8mc8tas0scvsfh43e2mzl	mx8s2u8q20vi8m6rwd5ozfp8	Normal	0	t	t	1
\.


--
-- Data for Name: restaurants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.restaurants (id, name, slug, status, "createdAt", "updatedAt", "onboardingStatus") FROM stdin;
btaafguqhzqlmr9wwzc37c7f	demo1	demo1	ACTIVE	2026-06-11 08:01:53.041	2026-06-11 08:13:04.311	COMPLETED
\.


--
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tables (id, "areaId", label, capacity, "positionX", "positionY", "createdAt", "updatedAt", shape) FROM stdin;
lhad99mya7kftf6fqm3tpurd	mzweit6dtvqz31203w005po4	1	\N	\N	\N	2026-06-11 08:12:41.329	2026-06-11 08:12:41.329	SQUARE
r4pe5zl8rrh1zim3fpml4elf	mzweit6dtvqz31203w005po4	2	\N	\N	\N	2026-06-11 08:12:41.332	2026-06-11 08:12:41.332	SQUARE
na4axh4w5k1acraeli483h2t	mzweit6dtvqz31203w005po4	3	\N	\N	\N	2026-06-11 08:12:41.333	2026-06-11 08:12:41.333	SQUARE
iy2vqg4d52i992jk8fohfzgf	mzweit6dtvqz31203w005po4	4	\N	\N	\N	2026-06-11 08:12:41.333	2026-06-11 08:12:41.333	SQUARE
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags (id, "restaurantId", label, color, "createdAt", "updatedAt") FROM stdin;
zvutm3e4dulcw2ygc5thf74j	btaafguqhzqlmr9wwzc37c7f	Vejetaryen	#16a34a	2026-06-11 10:18:08.374	2026-06-11 10:18:08.374
w77sergobzd37mznu4o0auep	btaafguqhzqlmr9wwzc37c7f	Vegan	#15803d	2026-06-11 10:18:08.379	2026-06-11 10:18:08.379
nwt4krildut13guk05grdnio	btaafguqhzqlmr9wwzc37c7f	Acı	#dc2626	2026-06-11 10:18:08.382	2026-06-11 10:18:08.382
haf81q7g9vitjqp896re6et9	btaafguqhzqlmr9wwzc37c7f	Şefin Önerisi	#b45309	2026-06-11 10:18:08.385	2026-06-11 10:18:08.385
vxqxfhn9ya09s4un8ns0b77b	btaafguqhzqlmr9wwzc37c7f	Yeni	#2563eb	2026-06-11 10:18:08.387	2026-06-11 10:18:08.387
\.


--
-- Name: _AllergenToMenuItem _AllergenToMenuItem_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_AllergenToMenuItem"
    ADD CONSTRAINT "_AllergenToMenuItem_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _MenuItemToTag _MenuItemToTag_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_MenuItemToTag"
    ADD CONSTRAINT "_MenuItemToTag_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: allergens allergens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allergens
    ADD CONSTRAINT allergens_pkey PRIMARY KEY (id);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: availability_windows availability_windows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_windows
    ADD CONSTRAINT availability_windows_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: floors floors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: option_groups option_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.option_groups
    ADD CONSTRAINT option_groups_pkey PRIMARY KEY (id);


--
-- Name: options options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.options
    ADD CONSTRAINT options_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: tables tables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: _AllergenToMenuItem_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_AllergenToMenuItem_B_index" ON public."_AllergenToMenuItem" USING btree ("B");


--
-- Name: _MenuItemToTag_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_MenuItemToTag_B_index" ON public."_MenuItemToTag" USING btree ("B");


--
-- Name: allergens_restaurantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "allergens_restaurantId_idx" ON public.allergens USING btree ("restaurantId");


--
-- Name: allergens_restaurantId_label_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "allergens_restaurantId_label_key" ON public.allergens USING btree ("restaurantId", label);


--
-- Name: areas_floorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "areas_floorId_idx" ON public.areas USING btree ("floorId");


--
-- Name: areas_floorId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "areas_floorId_name_key" ON public.areas USING btree ("floorId", name);


--
-- Name: availability_windows_itemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "availability_windows_itemId_idx" ON public.availability_windows USING btree ("itemId");


--
-- Name: categories_restaurantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "categories_restaurantId_idx" ON public.categories USING btree ("restaurantId");


--
-- Name: categories_restaurantId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "categories_restaurantId_name_key" ON public.categories USING btree ("restaurantId", name);


--
-- Name: floors_restaurantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "floors_restaurantId_idx" ON public.floors USING btree ("restaurantId");


--
-- Name: floors_restaurantId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "floors_restaurantId_name_key" ON public.floors USING btree ("restaurantId", name);


--
-- Name: media_assets_itemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "media_assets_itemId_idx" ON public.media_assets USING btree ("itemId");


--
-- Name: menu_items_categoryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "menu_items_categoryId_idx" ON public.menu_items USING btree ("categoryId");


--
-- Name: menu_items_restaurantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "menu_items_restaurantId_idx" ON public.menu_items USING btree ("restaurantId");


--
-- Name: option_groups_itemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "option_groups_itemId_idx" ON public.option_groups USING btree ("itemId");


--
-- Name: options_groupId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "options_groupId_idx" ON public.options USING btree ("groupId");


--
-- Name: restaurants_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX restaurants_slug_key ON public.restaurants USING btree (slug);


--
-- Name: tables_areaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tables_areaId_idx" ON public.tables USING btree ("areaId");


--
-- Name: tags_restaurantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "tags_restaurantId_idx" ON public.tags USING btree ("restaurantId");


--
-- Name: tags_restaurantId_label_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "tags_restaurantId_label_key" ON public.tags USING btree ("restaurantId", label);


--
-- Name: _AllergenToMenuItem _AllergenToMenuItem_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_AllergenToMenuItem"
    ADD CONSTRAINT "_AllergenToMenuItem_A_fkey" FOREIGN KEY ("A") REFERENCES public.allergens(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _AllergenToMenuItem _AllergenToMenuItem_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_AllergenToMenuItem"
    ADD CONSTRAINT "_AllergenToMenuItem_B_fkey" FOREIGN KEY ("B") REFERENCES public.menu_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _MenuItemToTag _MenuItemToTag_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_MenuItemToTag"
    ADD CONSTRAINT "_MenuItemToTag_A_fkey" FOREIGN KEY ("A") REFERENCES public.menu_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _MenuItemToTag _MenuItemToTag_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_MenuItemToTag"
    ADD CONSTRAINT "_MenuItemToTag_B_fkey" FOREIGN KEY ("B") REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: allergens allergens_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allergens
    ADD CONSTRAINT "allergens_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public.restaurants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: areas areas_floorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT "areas_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES public.floors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: availability_windows availability_windows_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_windows
    ADD CONSTRAINT "availability_windows_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.menu_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: categories categories_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public.restaurants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: floors floors_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT "floors_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public.restaurants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_assets media_assets_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT "media_assets_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.menu_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: menu_items menu_items_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT "menu_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: menu_items menu_items_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT "menu_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public.restaurants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: option_groups option_groups_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.option_groups
    ADD CONSTRAINT "option_groups_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.menu_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: options options_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.options
    ADD CONSTRAINT "options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.option_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tables tables_areaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT "tables_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES public.areas(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tags tags_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT "tags_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public.restaurants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict XV8DrLvSlAn84R0hooNv4Grd1hKXVPUCE5uETtsPFivEjddIfGphJaHs6NOTjrM

