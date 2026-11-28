// Storage adapter: PostgreSQL in production (DATABASE_URL), SQLite for local development and tests.
// All SQL in the app is written once with `?` placeholders and runs on both.
const toPg=sql=>{let i=0;return sql.replace(/\?/g,()=>'$'+ ++i)};

async function sqlite(file){
 const {DatabaseSync}=await import('node:sqlite');const raw=new DatabaseSync(file);raw.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
 let queue=Promise.resolve();
 const store={dialect:'sqlite',lock:'',
  async get(sql,...p){return raw.prepare(sql).get(...p)},async all(sql,...p){return raw.prepare(sql).all(...p)},async run(sql,...p){return raw.prepare(sql).run(...p)},async exec(sql){raw.exec(sql)},
  // One connection means transactions must not interleave; they run one at a time.
  tx(fn){const job=queue.then(async()=>{raw.exec('BEGIN IMMEDIATE');try{const out=await fn(store);raw.exec('COMMIT');return out}catch(e){raw.exec('ROLLBACK');throw e}});queue=job.catch(()=>{});return job},
  async close(){await queue;raw.close()}};
 return store;
}
async function postgres(url){
 const {default:pg}=await import('pg');pg.types.setTypeParser(20,Number);
 const pool=new pg.Pool({connectionString:url,max:Number(process.env.PG_POOL||10),idleTimeoutMillis:30000});
 const bind=(client,lock)=>({dialect:'postgres',lock,
  async get(sql,...p){return (await client.query(toPg(sql),p)).rows[0]},async all(sql,...p){return (await client.query(toPg(sql),p)).rows},
  async run(sql,...p){const r=await client.query(toPg(sql),p);return {changes:r.rowCount}},async exec(sql){await client.query(sql)}});
 const store={...bind(pool,''),
  async tx(fn){const client=await pool.connect();try{await client.query('BEGIN');const out=await fn(bind(client,' FOR UPDATE'));await client.query('COMMIT');return out}catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}},
  async close(){await pool.end()}};
 return store;
}
export async function openStore(target){
 const store=/^postgres(ql)?:\/\//.test(target||'')?await postgres(target):await sqlite(target||':memory:');
 const big=store.dialect==='postgres'?'BIGINT':'INTEGER',serial=store.dialect==='postgres'?'BIGSERIAL PRIMARY KEY':'INTEGER PRIMARY KEY';
 for(const sql of [
  `CREATE TABLE IF NOT EXISTS shops(code TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL,target INTEGER NOT NULL,reward TEXT NOT NULL,created ${big} NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS cards(member TEXT PRIMARY KEY,customer TEXT NOT NULL,code TEXT REFERENCES shops(code),name TEXT,category TEXT,number TEXT,stamps INTEGER NOT NULL DEFAULT 0,created ${big} NOT NULL DEFAULT 0,UNIQUE(customer,code))`,
  `CREATE TABLE IF NOT EXISTS events(id ${serial},customer TEXT NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL,label TEXT NOT NULL,delta TEXT NOT NULL,at ${big} NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS activity_feed ON events(customer,id)','CREATE INDEX IF NOT EXISTS cards_by_code ON cards(code)','CREATE INDEX IF NOT EXISTS shops_by_owner ON shops(owner)',
  'CREATE TABLE IF NOT EXISTS languages(customer TEXT PRIMARY KEY,lang TEXT NOT NULL,muted INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS requests(customer TEXT,request TEXT,PRIMARY KEY(customer,request))',
  `CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,pub TEXT UNIQUE NOT NULL,created ${big} NOT NULL,seen ${big} NOT NULL,salt TEXT,hash TEXT,merged_into TEXT)`,
  `CREATE TABLE IF NOT EXISTS admin_log(id ${serial},at ${big} NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL DEFAULT '',detail TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS recover_attempts(who TEXT NOT NULL,at ${big} NOT NULL)`,'CREATE INDEX IF NOT EXISTS attempts_by_who ON recover_attempts(who)'
 ])await store.exec(sql);
 // Columns added after the first release.
 try{await store.exec('ALTER TABLE languages ADD COLUMN muted INTEGER NOT NULL DEFAULT 0')}catch{}
 try{await store.exec('ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0')}catch{}
 return store;
}
