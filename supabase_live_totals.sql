-- Live totals view + function
create or replace view public.issue_vote_totals as
select
  issue_id,
  sum(case when choice = 'yes' then 1 else 0 end)  as yes,
  sum(case when choice = 'no' then 1 else 0 end)   as no,
  sum(case when choice = 'unsure' then 1 else 0 end) as unsure
from public.votes
group by issue_id;

create or replace function public.get_issue_counts(issue_id_input text)
returns table(yes bigint, no bigint, unsure bigint)
language sql
stable
as $$
  select
    sum(case when choice='yes' then 1 else 0 end) as yes,
    sum(case when choice='no' then 1 else 0 end) as no,
    sum(case when choice='unsure' then 1 else 0 end) as unsure
  from public.votes
  where issue_id = issue_id_input;
$$;
grant execute on function public.get_issue_counts(text) to anon;
