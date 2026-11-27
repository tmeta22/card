const language = localStorage.getItem('cardyeung-language') === 'en' ? 'en' : 'km';
document.documentElement.lang = language;
const dictionary = {
 'The wallet':'កាបូបកាត','For shops':'សម្រាប់ហាង','Open wallet':'បើកកាបូបកាត',
 'TELEGRAM LOYALTY WALLET':'កាបូបកាតសមាជិកក្នុង Telegram','One wallet.':'កាបូបតែមួយ។','Every reward.':'គ្រប់រង្វាន់។',
 'From your morning coffee to movie night, keep every loyalty card together in Telegram.':'ចាប់ពីកាហ្វេពេលព្រឹក ដល់ការមើលកុនពេលល្ងាច រក្សាទុកកាតសមាជិកទាំងអស់របស់អ្នកក្នុង Telegram។',
 'Explore the wallet':'សាកល្បងកាបូបកាត',"I'm a shop owner":'ខ្ញុំជាម្ចាស់ហាង',
 'MEMBER PASS':'កាតសមាជិក','CINEMA PASS':'កាតរោងកុន','LOYALTY PASS':'កាតសន្សំត្រា','Loyalty pass':'កាតសន្សំត្រា','7 OF 10 STAMPS':'ត្រា ៧ ក្នុងចំណោម ១០',
 'THE COLLECTION':'បណ្ដុំកាត','A card for every routine.':'កាតសម្រាប់រាល់សកម្មភាពប្រចាំថ្ងៃ។','COFFEE':'ហាងកាហ្វេ','FITNESS':'ក្លឹបហាត់ប្រាណ','ENTERTAINMENT':'កម្សាន្ត',
 'FOR SHOP OWNERS':'សម្រាប់ម្ចាស់ហាង','Make the next visit':'ឱ្យអតិថិជនមានហេតុផល','worth collecting.':'ត្រឡប់មកម្តងទៀត។',
 'Explore Shop studio':'សាកល្បងគ្រប់គ្រងហាង','Design your program':'បង្កើតកម្មវិធីសន្សំត្រា','Pick the stamp goal and the reward your customers can earn.':'កំណត់ចំនួនត្រា និងរង្វាន់ដែលអតិថិជនអាចប្ដូរយកបាន។',
 'Share one join code':'ចែករំលែកលេខកូដចូលរួម','Customers add your shop to their wallet at the counter.':'អតិថិជនបញ្ចូលលេខកូដនៅបញ្ជរ ដើម្បីបន្ថែមកាតហាងរបស់អ្នកទៅក្នុងកាបូប។',
 'Stamp each visit':'ផ្ដល់ត្រារាល់ពេលមកហាង',"Enter a member code to award a stamp or redeem a full card.":'បញ្ចូលលេខកូដសមាជិក ដើម្បីផ្ដល់ត្រា ឬប្ដូរយករង្វាន់ពេលសន្សំគ្រប់។',
 'Free for shops and cardholders.':'ឥតគិតថ្លៃសម្រាប់ហាង និងសមាជិក។',
 'PERSONAL':'ផ្ទាល់ខ្លួន','BUSINESS':'អាជីវកម្ម','Workspace':'ផ្ទាំងការងារ','My wallet':'កាបូបកាតរបស់ខ្ញុំ','My rewards':'រង្វាន់របស់ខ្ញុំ','Activity':'ប្រវត្តិប្រើប្រាស់','Shop studio':'គ្រប់គ្រងហាង','Telegram Mini App':'កម្មវិធីតូចក្នុង Telegram','Preview wallet':'កាបូបសាកល្បង','Sokha':'សុខា','View activity':'មើលប្រវត្តិប្រើប្រាស់',
 'Your loyalty cards, all in one place.':'កាតសមាជិកទាំងអស់របស់អ្នក នៅកន្លែងតែមួយ។','Add card':'បន្ថែមកាត','Total cards':'ចំនួនកាតសរុប','Collected stamps':'ត្រាដែលបានសន្សំ','Rewards ready':'រង្វាន់អាចប្ដូរបាន','My cards':'កាតរបស់ខ្ញុំ','Search cards':'ស្វែងរកកាត','All cards':'កាតទាំងអស់','Coffee':'កាហ្វេ','Fitness':'ហាត់ប្រាណ','Entertainment':'កម្សាន្ត','Other':'ផ្សេងៗ','Recent activity':'ប្រវត្តិថ្មីៗ','View all':'មើលទាំងអស់',
 'Free handcrafted drink':'ភេសជ្ជៈឥតគិតថ្លៃ ១ កែវ','Free day pass':'ហាត់ប្រាណឥតគិតថ្លៃ ១ ថ្ងៃ','Free movie ticket':'សំបុត្រកុនឥតគិតថ្លៃ ១ សន្លឹក',
 'Stamp earned':'ទទួលបានត្រា','Reward unlocked':'សន្សំបានរង្វាន់','Reward ready':'អាចប្ដូររង្វាន់បាន','+1 stamp':'+១ ត្រា','New card':'កាតថ្មី','Redeemed':'បានប្ដូររង្វាន់','Reward redeemed':'បានប្ដូរយករង្វាន់','Membership saved':'បានរក្សាទុកកាតសមាជិក','Program joined':'បានចូលរួមកម្មវិធី',
 'Membership card':'កាតសមាជិក','Show membership':'បង្ហាញកាតសមាជិក','Your card activity will appear here.':'ប្រវត្តិប្រើប្រាស់កាតរបស់អ្នកនឹងបង្ហាញនៅទីនេះ។','No cards to show.':'គ្មានកាតត្រូវបង្ហាញទេ។',
 'Visits, stamps, and redemptions across your cards.':'មើលប្រវត្តិមកហាង ការសន្សំត្រា និងការប្ដូររង្វាន់។','Show your completed card at the shop to claim your reward.':'បង្ហាញកាតដែលសន្សំត្រាគ្រប់នៅហាង ដើម្បីប្ដូរយករង្វាន់។','Complete a stamp card to unlock your first reward.':'សន្សំត្រាឱ្យគ្រប់លើកាតមួយ ដើម្បីទទួលបានរង្វាន់ដំបូង។',
 'Create a free stamp card for your customers.':'បង្កើតកាតសន្សំត្រាដោយឥតគិតថ្លៃសម្រាប់អតិថិជនរបស់អ្នក។','New program':'កម្មវិធីថ្មី','Customer join code':'លេខកូដចូលរួម','Award stamp':'ផ្ដល់ត្រា','Redeem reward':'ប្ដូររង្វាន់','Your first loyalty program':'កម្មវិធីសន្សំត្រាដំបូងរបស់អ្នក','Choose a stamp goal and reward. Share your join code at the counter, then use each customer’s member code to record visits.':'កំណត់ចំនួនត្រា និងរង្វាន់។ ចែករំលែកលេខកូដចូលរួមនៅបញ្ជរ ហើយប្រើលេខកូដសមាជិករបស់អតិថិជន ដើម្បីកត់ត្រារាល់ពេលពួកគេមកហាង។',
 'Create program':'បង្កើតកម្មវិធី','Add a card':'បន្ថែមកាត','Shop join code':'លេខកូដចូលរួមរបស់ហាង','Join program':'ចូលរួមកម្មវិធី','Save an existing membership card':'រក្សាទុកកាតសមាជិកដែលមានស្រាប់','Save membership':'រក្សាទុកកាតសមាជិក','Shop name':'ឈ្មោះហាង','Category':'ប្រភេទហាង','Membership number':'លេខសមាជិក','Save card':'រក្សាទុកកាត','Reward':'រង្វាន់','Stamps per reward':'ចំនួនត្រាសម្រាប់រង្វាន់មួយ','Telegram wallet':'កាបូបកាតក្នុង Telegram','Your wallet syncs with your Telegram account.':'កាបូបកាតរបស់អ្នកភ្ជាប់ជាមួយគណនី Telegram។',
 'You are exploring a sample wallet on this device. Open the configured CardYeung bot and choose My wallet to use your Telegram account.':'នេះជាកាបូបសាកល្បងនៅលើឧបករណ៍នេះ។ នៅពេលបានភ្ជាប់បូត CardYeung រួច សូមបើកបូត ហើយជ្រើសកាបូបកាត ដើម្បីប្រើគណនី Telegram របស់អ្នក។',
 'Card details':'ព័ត៌មានកាត','Show this membership number at checkout.':'បង្ហាញលេខសមាជិកនេះនៅបញ្ជរទូទាត់។','Your reward is ready. Show this code at checkout.':'អ្នកអាចប្ដូររង្វាន់បានហើយ។ បង្ហាញលេខកូដនេះនៅបញ្ជរទូទាត់។','Show your member code to collect a stamp.':'បង្ហាញលេខកូដសមាជិករបស់អ្នក ដើម្បីទទួលបានត្រា។','Member code':'លេខកូដសមាជិក','Award a stamp':'ផ្ដល់ត្រាមួយ','Customer member code':'លេខកូដសមាជិកអតិថិជន','Confirm redemption':'បញ្ជាក់ការប្ដូររង្វាន់','Close':'បិទ','Saved successfully':'បានរក្សាទុកដោយជោគជ័យ',
 'Shop code not found.':'រកមិនឃើញលេខកូដហាងនេះទេ។','This card is already in your wallet.':'កាតនេះមានក្នុងកាបូបរបស់អ្នករួចហើយ។','Member not found in this program.':'រកមិនឃើញសមាជិកនេះក្នុងកម្មវិធីទេ។','More stamps are needed.':'ត្រូវសន្សំត្រាបន្ថែមទៀត។','Redeem the current reward first.':'សូមប្ដូររង្វាន់បច្ចុប្បន្នជាមុនសិន។','Please complete every field.':'សូមបំពេញព័ត៌មានគ្រប់ប្រអប់។','This program is already in your wallet.':'កាតកម្មវិធីនេះមានក្នុងកាបូបរួចហើយ។','Member not found in your program.':'រកមិនឃើញសមាជិកក្នុងកម្មវិធីរបស់អ្នកទេ។','Connecting to your Telegram wallet…':'កំពុងភ្ជាប់កាបូបកាតក្នុង Telegram…','Reopen the wallet from Telegram to sign in.':'សូមបើកកាបូបកាតម្ដងទៀតពី Telegram ដើម្បីចូលគណនី។','The Telegram bot has not been configured on this server.':'ម៉ាស៊ីនមេនេះមិនទាន់បានភ្ជាប់ជាមួយបូត Telegram ទេ។','Unable to complete the request.':'មិនអាចបញ្ចប់សំណើបានទេ។','Please try again.':'សូមព្យាយាមម្ដងទៀត។','Choose 2 to 50 stamps.':'សូមជ្រើសពី ២ ដល់ ៥០ ត្រា។','Open this wallet in Telegram.':'សូមបើកកាបូបកាតនេះក្នុង Telegram។',
 'Forest-green leather coffee card with gold-foil beans':'កាតកាហ្វេស្បែកពណ៌បៃតង ជាមួយគ្រាប់កាហ្វេពណ៌មាស','Cobalt knurled-metal fitness card':'កាតហាត់ប្រាណដែកពណ៌ខៀវ','Burgundy velvet curtain cinema card':'កាតរោងកុនវ៉េលវ៉ែតពណ៌ក្រហមចាស់','Example loyalty cards':'គំរូកាតសន្សំត្រា',
 'Your Loyalty Cards':'កាតសមាជិករបស់អ្នក','Statistics':'ស្ថិតិ','Add New Card':'បន្ថែមកាតថ្មី','Add your first card to get started.':'បន្ថែមកាតដំបូងរបស់អ្នក ដើម្បីចាប់ផ្ដើម។','Member':'សមាជិក','Membership':'សមាជិកភាព','Reward ready':'អាចប្ដូររង្វាន់បាន',
 'General':'ទូទៅ','Stamps':'ត្រា','Rewards':'រង្វាន់','Monthly':'ប្រចាំខែ','Weekly':'ប្រចាំសប្ដាហ៍','Transactions':'ប្រតិបត្តិការ','Almost there':'ជិតបានហើយ','Back':'ត្រឡប់ក្រោយ','Scan QR':'ស្កេន QR','Main':'ម៉ឺនុយ',
 'Scan the shop’s QR code, or type its join code.':'ស្កេន QR របស់ហាង ឬវាយលេខកូដចូលរួម។','Join QR':'QR ចូលរួម','Scan to join':'ស្កេនដើម្បីចូលរួម','Join program':'ចូលរួមកម្មវិធី','Share':'ចែករំលែក','Copy link':'ចម្លងតំណ','Link copied':'បានចម្លងតំណ',
 'Customers add your shop to their wallet at the counter.':'អតិថិជនបន្ថែមហាងរបស់អ្នកទៅក្នុងកាបូប នៅបញ្ជរ។','Members':'សមាជិក','Ready':'អាចប្ដូរបាន','Scan customer':'ស្កេនអតិថិជន','Enter code':'បញ្ចូលលេខកូដ','Continue':'បន្ត',
 'Customer card':'កាតអតិថិជន','Customer member code':'លេខកូដសមាជិកអតិថិជន','Ask the customer to open their card, then type the code under the QR.':'សូមឱ្យអតិថិជនបើកកាតរបស់ខ្លួន ហើយវាយលេខកូដនៅក្រោម QR។',
 'Point the camera at a shop’s join QR.':'ដាក់កាមេរ៉ាទៅលើ QR ចូលរួមរបស់ហាង។','Point the camera at the customer’s card QR.':'ដាក់កាមេរ៉ាទៅលើ QR កាតរបស់អតិថិជន។','Scan a member card to award a stamp or redeem a full card.':'ស្កេនកាតសមាជិក ដើម្បីផ្ដល់ត្រា ឬប្ដូររង្វាន់ពេលសន្សំគ្រប់។','Redeem reward':'ប្ដូររង្វាន់','Member not found in your program.':'រកមិនឃើញសមាជិកក្នុងកម្មវិធីរបស់អ្នកទេ។',
 'Account':'គណនី','Welcome to CardYeung':'សូមស្វាគមន៍មកកាន់ CardYeung','Your account is created from your Telegram profile, so there is nothing to type. Create a recovery code now so you can restore your cards if you ever lose access.':'គណនីរបស់អ្នកត្រូវបានបង្កើតពីប្រូហ្វាល់ Telegram ដូច្នេះមិនចាំបាច់វាយអ្វីទេ។ សូមបង្កើតលេខកូដសង្គ្រោះឥឡូវនេះ ដើម្បីស្ដារកាតរបស់អ្នកឡើងវិញ ពេលបាត់បង់ការចូលប្រើ។','Create my recovery code':'បង្កើតលេខកូដសង្គ្រោះ','I already have an account':'ខ្ញុំមានគណនីរួចហើយ',
 'Your recovery code':'លេខកូដសង្គ្រោះរបស់អ្នក','Keep it somewhere safe, such as Saved Messages. If you lose this Telegram account, enter it from a new one to bring your cards and shops back. It is shown only once.':'សូមរក្សាទុកក្នុងកន្លែងសុវត្ថិភាព ដូចជា Saved Messages។ ប្រសិនបើបាត់គណនី Telegram នេះ សូមបញ្ចូលវាពីគណនីថ្មី ដើម្បីយកកាត និងហាងរបស់អ្នកមកវិញ។ លេខកូដនេះបង្ហាញតែម្ដងគត់។','Copy code':'ចម្លងលេខកូដ','Code copied':'បានចម្លងលេខកូដ','I saved it':'ខ្ញុំបានរក្សាទុករួចហើយ','Done':'រួចរាល់',
 'Telegram account':'គណនី Telegram','New recovery code':'លេខកូដសង្គ្រោះថ្មី','Create recovery code':'បង្កើតលេខកូដសង្គ្រោះ','Recover another account':'ស្ដារគណនីផ្សេង','Recover my account':'ស្ដារគណនីរបស់ខ្ញុំ','Enter the recovery code from your old account. Its cards, rewards and shops move to this Telegram account.':'បញ្ចូលលេខកូដសង្គ្រោះពីគណនីចាស់។ កាត រង្វាន់ និងហាងរបស់វានឹងផ្លាស់មកគណនី Telegram នេះ។','Recovery code':'លេខកូដសង្គ្រោះ','Recover account':'ស្ដារគណនី','Recovery code not valid.':'លេខកូដសង្គ្រោះមិនត្រឹមត្រូវទេ។','This is already your account.':'នេះជាគណនីរបស់អ្នករួចហើយ។','Too many attempts. Try again in an hour.':'ព្យាយាមច្រើនពេក។ សូមសាកម្ដងទៀតក្រោយមួយម៉ោង។'
};
function khnum(value){return String(value).replace(/\d/g,d=>'០១២៣៤៥៦៧៨៩'[d])}
function km(value){
 if(Object.hasOwn(dictionary,value))return dictionary[value];
 const hello=value.match(/^Welcome back, (.+)!$/);if(hello)return 'សូមស្វាគមន៍ត្រឡប់មកវិញ '+(dictionary[hello[1]]||hello[1])+'!';
 if(/^\d+( \/ \d+)? stamps$/.test(value))return khnum(value.replace(' stamps',' ត្រា'));
 const goal=value.match(/^(\d+) stamps earn (.+)\.$/);if(goal)return 'សន្សំ '+khnum(goal[1])+' ត្រា ដើម្បីទទួលបាន '+(dictionary[goal[2]]||goal[2])+'។';
 if(value.includes(' · '))return value.split(' · ').map(km).join(' · ');
 return value;
}
function localize(root){
 if(language!=='km'||!root)return;
 if(root.nodeType===Node.ELEMENT_NODE&&root.matches('script,style,[data-locale-toggle]'))return;
 if(root.nodeType===Node.TEXT_NODE){
 const original=root.nodeValue,clean=original.trim();if(!clean||root.parentElement?.closest('script,style,.code,[data-locale-toggle]'))return;
 let result=km(clean);if(/^\d+$/.test(clean)&&root.parentElement?.closest('.stat,.count'))result=khnum(clean);
 if(result!==clean)root.nodeValue=original.replace(clean,()=>result);return;
 }
 if(root.nodeType!==Node.ELEMENT_NODE)return;
 for(const attr of ['aria-label','alt','placeholder'])if(root.hasAttribute(attr))root.setAttribute(attr,km(root.getAttribute(attr)));
 for(const child of root.childNodes)localize(child);
}
document.addEventListener('DOMContentLoaded',()=>{
 document.title=language==='km'?(document.body.dataset.page==='wallet'?'CardYeung · កាបូបកាតរបស់ខ្ញុំ':'CardYeung · កាបូបកាតសមាជិកក្នុង Telegram'):document.title;
 const toggle=document.querySelector('[data-locale-toggle]');toggle.textContent=language==='km'?'English':'ភាសាខ្មែរ';toggle.lang=language==='km'?'en':'km';
 toggle.onclick=()=>{localStorage.setItem('cardyeung-language',language==='km'?'en':'km');location.reload()};
 localize(document.body);
 if(language==='km')new MutationObserver(records=>{for(const r of records){if(r.type==='characterData')localize(r.target);else for(const n of r.addedNodes)localize(n)}}).observe(document.body,{childList:true,characterData:true,subtree:true});
});
