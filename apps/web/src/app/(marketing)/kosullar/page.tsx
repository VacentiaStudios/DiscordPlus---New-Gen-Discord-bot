import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Kullanım koşulları' };

export default function TermsPage() {
  return (
    <LegalPage title="Kullanım koşulları" updated="4 Ekim 2026">
      <p>
        DiscordPlus botunu veya web panelini kullanarak bu koşulları kabul etmiş olursunuz.
        DiscordPlus, Vacentia Studios tarafından geliştirilir ve Discord Inc. ile bağlantılı
        değildir.
      </p>

      <h2>Hizmet</h2>
      <p>
        DiscordPlus, Discord sunucuları için moderasyon, otomatik moderasyon ve loglama araçları
        sunar. Hizmet olduğu gibi sağlanır; özellikler önceden haber verilmeksizin değiştirilebilir
        veya kaldırılabilir.
      </p>

      <h2>Kullanıcı yükümlülükleri</h2>
      <ul>
        <li>Discord Hizmet Koşulları&apos;na ve Topluluk Kurallarına uymalısınız.</li>
        <li>
          Botu yalnızca yönetme yetkiniz olan sunucularda yapılandırabilirsiniz ve sunucunuzdaki
          moderasyon kararlarının sorumluluğu size aittir.
        </li>
        <li>
          Hizmeti kötüye kullanmak, aşırı yüklemek veya güvenlik önlemlerini aşmaya çalışmak
          yasaktır.
        </li>
      </ul>

      <h2>Sorumluluğun sınırlandırılması</h2>
      <p>
        Otomatik moderasyon kararları hatalı olabilir. Vacentia Studios, hizmetin kullanımından
        doğan doğrudan veya dolaylı zararlardan, yürürlükteki mevzuatın izin verdiği ölçüde sorumlu
        tutulamaz.
      </p>

      <h2>Hizmetin sonlandırılması</h2>
      <p>
        Bu koşulları ihlal eden sunucular veya kullanıcılar için hizmet erişimi kısıtlanabilir. Botu
        sunucunuzdan dilediğiniz zaman çıkarabilirsiniz.
      </p>

      <h2>Değişiklikler</h2>
      <p>
        Bu koşullar güncellenebilir. Önemli değişiklikler bu sayfada duyurulur; hizmeti kullanmaya
        devam etmeniz güncel koşulları kabul ettiğiniz anlamına gelir.
      </p>

      <h2>İletişim</h2>
      <p>Sorularınız için: [iletişim adresi eklenecek]</p>
    </LegalPage>
  );
}
