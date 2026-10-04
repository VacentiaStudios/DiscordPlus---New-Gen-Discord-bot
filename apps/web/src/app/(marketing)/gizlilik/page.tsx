import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Gizlilik politikası' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Gizlilik politikası" updated="4 Ekim 2026">
      <p>
        Bu politika, Vacentia Studios tarafından geliştirilen DiscordPlus botunun ve web panelinin
        hangi verileri neden işlediğini açıklar.
      </p>

      <h2>Web paneli</h2>
      <p>Discord ile giriş yaptığınızda yalnızca şu izinleri isteriz:</p>
      <ul>
        <li>
          <strong>Kimlik (identify):</strong> Discord kullanıcı kimliğiniz, kullanıcı adınız,
          görünen adınız ve avatarınız.
        </li>
        <li>
          <strong>Sunucular (guilds):</strong> Üyesi olduğunuz sunucular ve bu sunuculardaki
          yetkileriniz. Bu liste yalnızca hangi sunucuları yönetebileceğinizi belirlemek için
          kullanılır ve veritabanına kaydedilmez; kısa süreliğine bellekte tutulur.
        </li>
      </ul>
      <p>
        E-posta adresinizi istemeyiz. Discord&apos;un verdiği erişim anahtarları veritabanında
        şifrelenmiş olarak saklanır. Oturum bilgileri (oturum anahtarı, IP adresi ve tarayıcı
        bilgisi) güvenlik amacıyla tutulur ve oturum sona erdiğinde geçersiz olur.
      </p>

      <h2>Bot</h2>
      <ul>
        <li>
          <strong>Sunucu bilgileri:</strong> Botun bulunduğu sunucuların kimliği, adı ve simgesi.
        </li>
        <li>
          <strong>Sunucu ayarları:</strong> Panelden yapılan ayarlar ve bu ayarları kimin ne zaman
          değiştirdiği.
        </li>
        <li>
          <strong>Moderasyon vakaları:</strong> İşlem türü, hedef kullanıcının ve moderatörün
          kimliği ile kullanıcı adı, sebep, süre ve tarih.
        </li>
        <li>
          <strong>Mesaj içerikleri:</strong> AutoMod ve loglama için yalnızca anlık olarak işlenir
          ve veritabanına yazılmaz. Sunucu yöneticileri log kanalı ayarladıysa ilgili mesajlar o
          sunucunun kendi log kanalına gönderilir.
        </li>
      </ul>

      <h2>Paylaşım</h2>
      <p>
        Verileriniz üçüncü taraflarla paylaşılmaz ve satılmaz. Veriler yalnızca hizmeti sunmak için
        Discord&apos;un API&apos;si üzerinden işlenir.
      </p>

      <h2>Saklama ve silme</h2>
      <p>
        Moderasyon vakaları ve sunucu ayarları, sunucu yöneticileri tarafından silinene veya silme
        talebinde bulunulana kadar saklanır. Verilerinizin silinmesini veya size iletilmesini
        aşağıdaki iletişim adresinden talep edebilirsiniz.
      </p>

      <h2>İletişim</h2>
      <p>Sorularınız ve talepleriniz için: [iletişim adresi eklenecek]</p>
    </LegalPage>
  );
}
