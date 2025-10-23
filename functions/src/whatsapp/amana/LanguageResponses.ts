/**
 * Amana - Language-Aware Responses
 * Matches user's language for natural conversation flow
 */

export type Language = 'en' | 'pidgin' | 'ha' | 'ig' | 'yo';

/**
 * Response templates in different Nigerian languages
 */
export const responses = {
  // Working on it...
  working: {
    en: "⏳ Working on it...",
    pidgin: "⏳ I dey work on am...",
    ha: "⏳ Ina aiki...",
    ig: "⏳ Ana m arụ ọrụ...",
    yo: "⏳ Mo n ṣiṣẹ lori rẹ..."
  },

  // Client not found
  clientNotFound: {
    en: (name: string) => `Client "${name}" not found in your records.\n\nWould you like to add them?`,
    pidgin: (name: string) => `I no see "${name}" for your client list o.\n\nYou wan add am?`,
    ha: (name: string) => `Ba mu sami "${name}" a cikin bayanan ku ba.\n\nKuna so ku ƙara su?`,
    ig: (name: string) => `Ahụghị m "${name}" n'ime ndekọ gị.\n\nỊ chọrọ itinye ha?`,
    yo: (name: string) => `Mi o ri "${name}" ninu awọn onibara rẹ.\n\nṢe o fẹ fi wọn kun?`
  },

  // Adding client - ask for contact person
  askContactPerson: {
    en: "👤 Who is the contact person at this company?\n\n💡 _Or type 'skip' if not applicable_",
    pidgin: "👤 Wetin be the name of person wey we go dey contact for this company?\n\n💡 _Or type 'skip' if e no apply_",
    ha: "👤 Wane ne sunan mai tuntuɓar wannan kamfani?\n\n💡 _Ko rubuta 'skip' idan ba ya shafa_",
    ig: "👤 Kedụ aha onye ga-akpọtụrụ na ụlọ ọrụ a?\n\n💡 _Ma ọ bụ dee 'skip' ma ọ bụrụ na ọ dịghị mkpa_",
    yo: "👤 Tani orukọ ẹni ti a yoo kan si ni ile-iṣẹ yii?\n\n💡 _Tabi kọ 'skip' ti ko ba wulo_"
  },

  // Ask for email
  askEmail: {
    en: "📧 What's their email address?\n\n💡 _Or type 'skip' to continue_",
    pidgin: "📧 Wetin be their email address?\n\n💡 _Or type 'skip' make we continue_",
    ha: "📧 Menene adireshin imel ɗin su?\n\n💡 _Ko rubuta 'skip' don ci gaba_",
    ig: "📧 Kedụ adreesị email ha?\n\n💡 _Ma ọ bụ dee 'skip' ka anyị gaa n'ihu_",
    yo: "📧 Kini adirẹsi imeeli wọn?\n\n💡 _Tabi kọ 'skip' lati tẹsiwaju_"
  },

  // Ask for phone
  askPhone: {
    en: "📱 What's their phone number?\n\n💡 _Or type 'skip' to continue_",
    pidgin: "📱 Wetin be their phone number?\n\n💡 _Or type 'skip' make we continue_",
    ha: "📱 Menene lambar wayar su?\n\n💡 _Ko rubuta 'skip' don ci gaba_",
    ig: "📱 Kedụ nọmba ekwentị ha?\n\n💡 _Ma ọ bụ dee 'skip' ka anyị gaa n'ihu_",
    yo: "📱 Kini nọmba foonu wọn?\n\n💡 _Tabi kọ 'skip' lati tẹsiwaju_"
  },

  // Ask for address
  askAddress: {
    en: "📍 What's their business address?\n\n💡 _Or type 'skip' to continue_",
    pidgin: "📍 Wetin be their business address?\n\n💡 _Or type 'skip' make we continue_",
    ha: "📍 Ina adireshin kasuwancin su?\n\n💡 _Ko rubuta 'skip' don ci gaba_",
    ig: "📍 Kedụ adreesị azụmahịa ha?\n\n💡 _Ma ọ bụ dee 'skip' ka anyị gaa n'ihu_",
    yo: "📍 Ibo ni adirẹsi iṣowo wọn wa?\n\n💡 _Tabi kọ 'skip' lati tẹsiwaju_"
  },

  // Ask for Tax ID
  askTaxId: {
    en: "🆔 What's their Tax ID (TIN)?\n\n💡 _Or type 'skip' if you don't have it_",
    pidgin: "🆔 Wetin be their Tax ID number (TIN)?\n\n💡 _Or type 'skip' if you no get am_",
    ha: "🆔 Menene lambar haraji nsu (TIN)?\n\n💡 _Ko rubuta 'skip' idan ba ku da shi_",
    ig: "🆔 Kedụ nọmba ụtụ isi ha (TIN)?\n\n💡 _Ma ọ bụ dee 'skip' ma ọ bụrụ na ị nweghị ya_",
    yo: "🆔 Kini nọmba owo-ori wọn (TIN)?\n\n💡 _Tabi kọ 'skip' ti o ko ni i_"
  },

  // Ask for RC Number
  askRcNumber: {
    en: "🏢 What's their CAC/RC Number?\n\n💡 _Or type 'skip' if you don't have it_",
    pidgin: "🏢 Wetin be their CAC/RC number?\n\n💡 _Or type 'skip' if you no get am_",
    ha: "🏢 Menene lambar CAC/RC nsu?\n\n💡 _Ko rubuta 'skip' idan ba ku da shi_",
    ig: "🏢 Kedụ nọmba CAC/RC ha?\n\n💡 _Ma ọ bụ dee 'skip' ma ọ bụrụ na ị nweghị ya_",
    yo: "🏢 Kini nọmba CAC/RC wọn?\n\n💡 _Tabi kọ 'skip' ti o ko ni i_"
  },

  // Client added successfully
  clientAdded: {
    en: (name: string) => `✅ Client "${name}" added successfully!\n\nNow, let's add the items for this invoice.`,
    pidgin: (name: string) => `✅ I don add "${name}" as client finish!\n\nNow, make we add the things wey dey for this invoice.`,
    ha: (name: string) => `✅ An ƙara "${name}" cikin nasara!\n\nYanzu, bari mu ƙara abubuwan wannan invoice.`,
    ig: (name: string) => `✅ Etinyela "${name}" nke ọma!\n\nUgbu a, ka anyị tinye ihe ndị dị na invoice a.`,
    yo: (name: string) => `✅ A ti fi "${name}" kun ni ifijišẹ!\n\nBayi, jẹ ka fi awọn nkan fun invoice yii kun.`
  },

  // Ask for invoice items
  askItems: {
    en: "📦 What items or services are on this invoice?\n\n💡 *Example:*\n\"50 bags of cement at 6000 naira each\"\n\"Transport from Lagos to Abuja, 250000\"",
    pidgin: "📦 Wetin be the things wey dey for this invoice?\n\n💡 *Example:*\n\"50 bags cement at 6000 naira each\"\n\"Transport from Lagos go Abuja, 250000\"",
    ha: "📦 Menene abubuwan da ke cikin wannan invoice?\n\n💡 *Misali:*\n\"Buhuna siminti 50 a naira 6000 kowanne\"\n\"Sufuri daga Lagos zuwa Abuja, 250000\"",
    ig: "📦 Gịnị bụ ihe ndị dị na invoice a?\n\n💡 *Ọmụmaatụ:*\n\"Akpa simenti 50 na naira 6000 nke ọ bụla\"\n\"Njem site na Lagos gaa Abuja, 250000\"",
    yo: "📦 Kini awọn nkan tabi iṣẹ ti o wa lori invoice yii?\n\n💡 *Apẹẹrẹ:*\n\"Apo simenti 50 ni naira 6000 kọọkan\"\n\"Gbigbe lati Lagos si Abuja, 250000\""
  },

  // Item added confirmation
  itemAdded: {
    en: (count: number) => `✅ Item added!\n\n📦 Current items: ${count}\n\n*Add another or type "done" to continue*`,
    pidgin: (count: number) => `✅ I don add the item!\n\n📦 Items wey we get now: ${count}\n\n*Add another one or type "done" make we continue*`,
    ha: (count: number) => `✅ An ƙara abu!\n\n📦 Abubuwan yanzu: ${count}\n\n*Ƙara wani ko rubuta "done" don ci gaba*`,
    ig: (count: number) => `✅ Etinyela ihe!\n\n📦 Ihe ndị dị ugbu a: ${count}\n\n*Tinye ọzọ ma ọ bụ dee "done" ka anyị gaa n'ihu*`,
    yo: (count: number) => `✅ A ti fi nkan kun!\n\n📦 Awọn nkan lọwọlọwọ: ${count}\n\n*Fi ọkan si i tabi kọ "done" lati tẹsiwaju*`
  },

  // Confirm invoice
  confirmInvoice: {
    en: "✅ *Confirm this invoice?*\n\nYes - Create it\nPreview - See how it looks\nEdit - Make changes\nCancel - Start over",
    pidgin: "✅ *You sure say na this invoice you wan create?*\n\nYes - Create am\nPreview - See how e go look\nEdit - Change am\nCancel - Start again",
    ha: "✅ *Tabbatar da wannan invoice?*\n\nYes - Ƙirƙira shi\nPreview - Duba yadda zai yi\nEdit - Yi canje-canje\nCancel - Fara daga farko",
    ig: "✅ *Kwenye invoice a?*\n\nYes - Mepụta ya\nPreview - Lee ka ọ ga-adị\nEdit - Gbanwee ya\nCancel - Malite ọzọ",
    yo: "✅ *Jẹrisi invoice yii?*\n\nYes - Ṣe e\nPreview - Wo bi o ṣe riran\nEdit - Ṣe ayipada\nCancel - Bẹrẹ lẹẹkansi"
  }
};

/**
 * Get response in user's language
 */
export function getResponse(
  key: keyof typeof responses,
  language: Language,
  ...args: string[]
): string {
  const response = responses[key][language] as any;

  if (typeof response === 'function') {
    return response(...args);
  }

  return response as string;
}
