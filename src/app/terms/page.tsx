import Link from "next/link";

export const metadata = {
  title: "Masharti ya Matumizi — KodiSalama",
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

export default function TermsPage() {
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
            Masharti ya Matumizi
          </h1>
          <p className="mt-1 text-sm text-emerald-100/80">
            Imesasishwa mwisho: {UPDATED}
          </p>
        </div>

        <article className="rounded-3xl bg-white p-6 shadow-2xl shadow-emerald-950/30 sm:p-8">
          <P>
            Karibu KodiSalama! Masharti haya yanaeleza sheria za kutumia huduma
            hii na namna programu inavyofanya kazi. Kwa kuunda akaunti au
            kutumia KodiSalama unakubali masharti yote hapa chini.
          </P>

          <H2>1. KodiSalama Ni Nini na Inavyofanya Kazi</H2>
          <P>KodiSalama ni daftari la kidijitali la mmiliki wa nyumba. Inakuruhusu:</P>
          <UL
            items={[
              "Kusajili vyumba vyako na kufuatilia vipi ni tupu na vipi vina wapangaji.",
              "Kusajili wapangaji: maelezo yao, kodi ya mwezi, amana (deposit), tarehe ya kuingia, na picha.",
              "Kurekodi malipo ya kodi (cash, M-Pesa, Tigo Pesa, Airtel, benki) na kuona ripoti za mapato.",
              "Kutengeneza mikataba ya kupanga rasmi yenye nembo ya Taifa na vifungu unavyochagua.",
              "Kutengeneza risiti na kikumbusho cha kodi kwa Kiswahili, na kuyituma kwa mpangaji kwa WhatsApp, SMS ya simu, au moja kwa moja kwa Gateway ya SMS (Africa's Talking).",
            ]}
          />
          <P>
            Kila mmiliki ana akaunti yake yenye nenosiri lake. Data yako
            imejifunga na akaunti yako pekee — haionekani kwa mmiliki mwingine
            wowote. Huduma hii inatumika mtandaoni, kwa hivyo unaweza kufikia
            data zako kutoka kifaa chochote kilenye intaneti kwa kuingia kwa
            nenosiri lako.
          </P>

          <H2>2. Kujiunga na Akaunti Yako</H2>
          <UL
            items={[
              "Lazima uwe na umri wa miaka 18 au zaidi na utoe taarifa sahihi (jina na barua pepe).",
              "Nenosiri lako ni la siri — usilihifadhi au kulishirikisha na mtu yeyote. Wewe ndiye mwajibikaji wa shughuli zote zinazofanyika chini ya akaunti yako.",
              "Akaunti moja ni ya mmiliki mmoja. Usitumie akaunti ya mwingine.",
            ]}
          />

          <H2>3. Data ya Wapangaji Wako ni Jukumu Lako</H2>
          <P>
            Wewe ndiye unaoingiza data ya wapangaji wako (majina, simu, NIDA,
            picha). Kwa sheria ya Ulinzi wa Data Binafsi ya Tanzania ya 2022,
            wewe ndiye Mwendekezaji wa Data (data controller) kwa data hiyo.
            Kwa hiyo:
          </P>
          <UL
            items={[
              "Lazima uwe na sababu halali au idhini ya mpangaji kabla ya kuingiza data yake.",
              "Usiingize data ya watu wasiohusika na biashara yako ya kupanga.",
              "Usitumie huduma hii kubagua, kufuatilia, au kuwadhuru wapangaji.",
            ]}
          />

          <H2>4. SMS Gateway (Africa's Talking)</H2>
          <UL
            items={[
              "Ujumbe wa SMS unatumwa kupitia akaunti yako mwenyewe ya Africa's Talking — gharama zake ni zako na zinaonekana kwenye dashibodi yao.",
              "Kutuma kwa Live kunahitaji salio (credit) kwenye akaunti yako ya Africa's Talking; Sender ID inaweza kuhitaji usajili wa TCRA.",
              "Kutuma ujumbe usioombwa, udanganyifu, au Spam ni marufuku kabisa — inaweza pelekea akaunti yako kusimamishwa.",
              "Namba za simu zinakamilishwa kwa mfumo wa kimataifa (+255...) kabla ya kutumwa.",
            ]}
          />

          <H2>5. Matumizi Yasiyokubalika</H2>
          <P>Usitumie KodiSalama kwa:</P>
          <UL
            items={[
              "Shughuli haramu au zinazokiuka sheria za Tanzania.",
              "Kuingiza data ya ulaghai au kujaribu kufikia akaunti za wengine.",
              "Kujaribu kuvunja, kuscan, au kuingilia miundombinu ya huduma (reverse engineering, scanning, abuse).",
            ]}
          />

          <H2>6. Gharama</H2>
          <P>
            Huduma kuu ya KodiSalama (daftari, wapangaji, malipo, mikataba,
            risiti) ni bure kwa sasa. Gharama pekee ni za SMS zinazopita kwenye
            akaunti yako ya Africa's Talking. Tukianza kutoza huduma kwa
            vipengele vipya, tutakujuza kabla.
          </P>

          <H2>7. Huduma Hutolewa &quot;Kama Ilivyo&quot;</H2>
          <UL
            items={[
              "Tunajitahidi kudumisha huduma kuwa inapatikana na salama, lakini hatutoi dhamana ya kuwa itakuwa bila makosa au kutokatika.",
              "Ni vizuri kufanya nakala za akiba (backup) za rekodi muhimu zako nje ya mfumo.",
              "KodiSalama ni zana ya usimamizi — haibadilishi wajibu wako wa kisheria kama mmiliki wa nyumba kwa wapangaji wako.",
            ]}
          />

          <H2>8. Kusimamisha au Kufuta Akaunti</H2>
          <UL
            items={[
              "Wewe: unaweza kuomba kufuta akaunti yako na data zako wakati wowote kwa barua pepe kwenda emamsodoki@gmail.com.",
              "Sisi: tunaweza kusimamisha akaunti inayokiuka masharti haya, inayotumia huduma kwa nia mbaya, au inayoathiri usalama wa watumiaji wengine. Tutakujulisha kwa barua pepe kama tuwezavyo.",
            ]}
          />

          <H2>9. Uwajibikaji</H2>
          <P>
            Kadiri inavyoruhusiwa na sheria, KodiSalama haiwajibiki kwa
            madhara ya moja kwa moja au ya isiyo moja kwa moja yanayotokana na
            matumizi ya huduma, kama kupoteza faida au data usizyoifanya nakala
            yake. Hakuna katika masharti haya kinachozuia uwajibikaji unaokataza
            kisheria.
          </P>

          <H2>10. Sheria Inayotawala</H2>
          <P>
            Masharti haya yanatawaliwa na sheria za Jamhuri ya Muungano wa
            Tanzania, pamoja na Sheria ya Ulinzi wa Data Binafsi ya 2022.
          </P>

          <H2>11. Mabadiliko ya Masharti</H2>
          <P>
            Tukibadilisha masharti haya, tutaiweka hapa na kusasisha tarehe ya
            &quot;Imesasishwa mwisho&quot;. Kuendelea kutumia huduma baada ya
            mabadiliko kunamaanisha umekubali toleo jipya.
          </P>

          <H2>12. Mawasiliano</H2>
          <P>
            Maswali kuhusu masharti haya? Tuma barua pepe kwenda{" "}
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
              href="/privacy"
              className="font-semibold text-emerald-700 underline underline-offset-2"
            >
              Sera ya Faragha
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
