-- Function to reset a sequence
create or replace function reset_sequence(sequence_name text)
returns void as $$
begin
  execute format('alter sequence %I restart with 1', sequence_name);
end;
$$ language plpgsql; 