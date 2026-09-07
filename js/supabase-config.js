// ========================== 
//  SUPABASE CONFIGURATION  
// ========================== 
const SUPABASE_URL = 'https://mzxbepfxlffffcbehftx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DmcAZaexsbX2MhnQ2hHIYA_IWhM8F7z';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Storage keys for song requests
const STORAGE_KEY_ADDED = 'dj_song_requests_added';
const STORAGE_KEY_VOTED = 'dj_song_requests_voted';
const MAX_ADDED_SONGS = 3;
