import Link from "next/link";

export const metadata = {
  title: "Sera ya Faragha — KodiSalama",
};

const UPDATED = "21 Oktoba 2026";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 mb-2 text-lg font-bold text-slate-900">{children}</h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-slate-600">{children}</p>;
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 text-center text-white">
          <Link
            href="/"
            className="text-xs font-semibold text-emerald-200 hover:text-white"
          >
            ← KodiSalama
          </Link>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
            Sera ya Faragha
          </h1>
          <p className="mt-1 text-sm text-emerald-100/80">
            Imesasishwa mwisho: {UPDATED}
          </p>
        </div>

        <article className="rounded-3xl bg-white p-6 shadow-2xl shadow-emerald-950/30 sm:p-8">
          <P>
            KodiSalama ni huduma mtandaoni inayosaidia wamiliki wa nyumba
            Tanzania kusimamia vyumba, wapangaji, malipo, mikataba, na mawasiliano
            ya SMS. Sera hii inaeleza data tunayokusanya, jinsi tunavyoitumia,
            na haki zako. Kwa kujiunga au kutumia KodiSalama unakubali sera hii.
          </P>

          <H2>1. Data Tunayokusanya</H2>
          <UL
            items={[
              "Akaunti yako: jina kamili, barua pepe, na nenosiri lako. Nenosiri halifanyi kazi kama lilivyo — huhifadhiwa kama hash (scrypt) ili hata sisi tuisome.",
              "Data ya biashara yako unayoingiza mwenyewe: vyumba, wapangaji (majina, namba za simu, NIDA, picha), malipo, mikataba, templeti za SMS, na vitufe vya Gateway (kama API key ya Africa's Talking).",
              "Historia ya SMS: kila ujumbe unapotumwa kwa Gateway tunarekodi namba, ujumbe, hali, na gharama yake — ili uweze kuona ripoti yako.",
              "Kipindi cha kikao (session cookie) moja tu cha kiufundi kinachokutambua baada ya kuingia. Hakuna matangazo, hakuna kufuatilia (tracking), hakuna analytics ya watu wengine.",
            ]}
          />

          <H2>2. Wewe Ndiye Mmiliki wa Data ya Wapangaji Wako</H2>
          <P>
            Wewe ndiye unaoamua kuingiza data ya wapangaji wako, na wewe ndiye
            mmiliki wake. Chini ya Sheria ya Ulinzi wa Data Binafsi ya Tanzania
            ya mwaka 2022 (Personal Data Protection Act), wewe ndiye
            &quot;Mwendekezaji wa Data&quot; (data controller) kwa data ya
            wapangaji wako, na sisi ni &quot;Mchakataji&quot; (processor) —
            tunaichakata kwa maagizo yako tu, kwa lengo la kutoa huduma.
          </P>
          <P>
            Kwa hiyo ni jukumu lako kupata idhini halali kutoka kwa wapangaji
            wako kabla ya kuingiza data yao binafsi kwenye mfumo.
          </P>

          <H2>3. Jinsi Tunavyotumia Data</H2>
          <UL
            items={[
              "Kutoa huduma: kuonyesha dashibodi yako, kuhifadhi rekodi zako, kutengeneza mikataba na risiti, na kutuma SMS unapozituma.",
              "Kulinda akaunti yako: kugundua matumizi yasiya kawaida na kuzuia unyakuzi.",
              "Hatuuza data yako. Hatuipa wahusuha wengine. Hatutumii kwa matangazo.",
            ]}
          />

          <H2>4. Huduma za Watu wa Tatu Tunazotumia</H2>
          <UL
            items={[
              "Vercel — hosting ya programu (data inapita kwenye seva zao zilizolindwa).",
              "Neon — hifadhidata ya Postgres (data zako zinahifadhiwa hapa, zimedhibitishwa kwa nenosiri na SSL).",
              "Africa's Talking — huduma ya SMS. Ukitumia Gateway ya SMS, namba ya simu ya mpangaji na ujumbe wako hutumwa kwa wao ili wauweze kuupeleka. Ufunguo wako wa API (API key) huhifadhiwa kwenye server na hauonyeshwi tena kamwe baada ya kuuokoa.",
            ]}
          />
          <P>
            Mawasiliano yote ya programu na hifadhidata husafiri kwa
            njia iliyosimbwa (HTTPS/TLS).
          </P>

          <H2>5. Utaratibu wa Kujitenga (Data Isolation)</H2>
          <P>
            Kila mmiliki wa nyumba ana akaunti yake. Data yako imefungwa na
            akaunti yako na haionekani kwa mmiliki mwingine wowote, hata akiwa
            ameingia kwa akaunti yake. Ni wewe tu (au mtu aliyejua nenosiri
            lako) anayeweza kuiona.
          </P>

          <H2>6. Usalama</H2>
          <UL
            items={[
              "Nenosiri huhifadhiwa kama hash ya scrypt — hatujui nenosiri lako.",
              "Kila ombi la API hubainishi mmiliki wake na hulindwa na kikao kilichosainiwa (signed session).",
              "Ufunguo wa API wa SMS huhifadhiwa server-side tu na haurudishwi kwa browser kamwe.",
            ]}
          />

          <H2>7. Kudumu na Kufutwa kwa Data</H2>
          <P>
            Data yako inadumu ukiwa na akaunti yako hai. Ukitaka kufuta
            akaunti yako na data zote tuma barua pepe kwenda{" "}
            <a
              href="mailto:emamsodoki@gmail.com"
              className="font-semibold text-emerald-700 underline underline-offset-2"
            >
              emamsodoki@gmail.com
            </a>{" "}
            — tutaifuta kwa ukamilifu.
          </P>

          <H2>8. Watoto</H2>
          <P>
            KodiSalama ni kwa watu wenye umri wa miaka 18 au zaidi. Hatukusanyi
            kwa makusudi data ya watoto.
          </P>

          <H2>9. Mabadiliko ya Sera Hii</H2>
          <P>
            Tukibadilisha sera hii, tutaiweka hapa na kusasisha tarehe ya
            &quot;Imesasishwa mwisho&quot;. Kuendelea kutumia huduma baada ya
            mabadiliko kunamaanisha umekubali toleo jipya.
          </P>

          <H2>10. Mawasiliano</H2>
          <P>
            Maswali kuhusu faragha yako? Tuma barua pepe kwenda{" "}
            <a
              href="mailto:emamsodoki@gmail.com"
              className="font-semibold text-emerald-700 underline underline-offset-2"
            >
              emamsodoki@gmail.com
            </a>
            .
          </P>

          <p className="mt-8 border-t border-slate-100 pt-4 text-sm text-slate-500">
            Angalia pia{" "}
            <Link
              href="/terms"
              className="font-semibold text-emerald-700 underline underline-offset-2"
            >
              Masharti ya Matumizi
            </Link>
            .
          </p>
        </article>

        <p className="mt-6 text-center text-[11px] text-emerald-100/60">
          KodiSalama · Usimamizi wa Wapangaji · 🇹🇿
        </p>
      </div>
    </div>
  );
}
