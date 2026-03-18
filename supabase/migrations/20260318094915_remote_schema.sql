drop extension if exists "pg_net";

create extension if not exists "vector" with schema "public";

create type "public"."SourceType" as enum ('URL', 'PDF', 'TEXT', 'TWEET');


  create table "public"."Chunk" (
    "id" text not null,
    "sourceId" text not null,
    "content" text not null,
    "chunkIndex" integer not null,
    "pageNumber" integer,
    "createdAt" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "embedding" public.vector(768)
      );



  create table "public"."Source" (
    "id" text not null,
    "type" public."SourceType" not null,
    "title" text not null,
    "url" text,
    "filePath" text,
    "content" text not null,
    "createdAt" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."_prisma_migrations" (
    "id" character varying(36) not null,
    "checksum" character varying(64) not null,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) not null,
    "logs" text,
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone not null default now(),
    "applied_steps_count" integer not null default 0
      );


CREATE INDEX "Chunk_embedding_idx" ON public."Chunk" USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');

CREATE UNIQUE INDEX "Chunk_pkey" ON public."Chunk" USING btree (id);

CREATE UNIQUE INDEX "Source_pkey" ON public."Source" USING btree (id);

CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id);

alter table "public"."Chunk" add constraint "Chunk_pkey" PRIMARY KEY using index "Chunk_pkey";

alter table "public"."Source" add constraint "Source_pkey" PRIMARY KEY using index "Source_pkey";

alter table "public"."_prisma_migrations" add constraint "_prisma_migrations_pkey" PRIMARY KEY using index "_prisma_migrations_pkey";

alter table "public"."Chunk" add constraint "Chunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."Source"(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."Chunk" validate constraint "Chunk_sourceId_fkey";

grant delete on table "public"."Chunk" to "anon";

grant insert on table "public"."Chunk" to "anon";

grant references on table "public"."Chunk" to "anon";

grant select on table "public"."Chunk" to "anon";

grant trigger on table "public"."Chunk" to "anon";

grant truncate on table "public"."Chunk" to "anon";

grant update on table "public"."Chunk" to "anon";

grant delete on table "public"."Chunk" to "authenticated";

grant insert on table "public"."Chunk" to "authenticated";

grant references on table "public"."Chunk" to "authenticated";

grant select on table "public"."Chunk" to "authenticated";

grant trigger on table "public"."Chunk" to "authenticated";

grant truncate on table "public"."Chunk" to "authenticated";

grant update on table "public"."Chunk" to "authenticated";

grant delete on table "public"."Chunk" to "service_role";

grant insert on table "public"."Chunk" to "service_role";

grant references on table "public"."Chunk" to "service_role";

grant select on table "public"."Chunk" to "service_role";

grant trigger on table "public"."Chunk" to "service_role";

grant truncate on table "public"."Chunk" to "service_role";

grant update on table "public"."Chunk" to "service_role";

grant delete on table "public"."Source" to "anon";

grant insert on table "public"."Source" to "anon";

grant references on table "public"."Source" to "anon";

grant select on table "public"."Source" to "anon";

grant trigger on table "public"."Source" to "anon";

grant truncate on table "public"."Source" to "anon";

grant update on table "public"."Source" to "anon";

grant delete on table "public"."Source" to "authenticated";

grant insert on table "public"."Source" to "authenticated";

grant references on table "public"."Source" to "authenticated";

grant select on table "public"."Source" to "authenticated";

grant trigger on table "public"."Source" to "authenticated";

grant truncate on table "public"."Source" to "authenticated";

grant update on table "public"."Source" to "authenticated";

grant delete on table "public"."Source" to "service_role";

grant insert on table "public"."Source" to "service_role";

grant references on table "public"."Source" to "service_role";

grant select on table "public"."Source" to "service_role";

grant trigger on table "public"."Source" to "service_role";

grant truncate on table "public"."Source" to "service_role";

grant update on table "public"."Source" to "service_role";

grant delete on table "public"."_prisma_migrations" to "anon";

grant insert on table "public"."_prisma_migrations" to "anon";

grant references on table "public"."_prisma_migrations" to "anon";

grant select on table "public"."_prisma_migrations" to "anon";

grant trigger on table "public"."_prisma_migrations" to "anon";

grant truncate on table "public"."_prisma_migrations" to "anon";

grant update on table "public"."_prisma_migrations" to "anon";

grant delete on table "public"."_prisma_migrations" to "authenticated";

grant insert on table "public"."_prisma_migrations" to "authenticated";

grant references on table "public"."_prisma_migrations" to "authenticated";

grant select on table "public"."_prisma_migrations" to "authenticated";

grant trigger on table "public"."_prisma_migrations" to "authenticated";

grant truncate on table "public"."_prisma_migrations" to "authenticated";

grant update on table "public"."_prisma_migrations" to "authenticated";

grant delete on table "public"."_prisma_migrations" to "service_role";

grant insert on table "public"."_prisma_migrations" to "service_role";

grant references on table "public"."_prisma_migrations" to "service_role";

grant select on table "public"."_prisma_migrations" to "service_role";

grant trigger on table "public"."_prisma_migrations" to "service_role";

grant truncate on table "public"."_prisma_migrations" to "service_role";

grant update on table "public"."_prisma_migrations" to "service_role";


