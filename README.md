# DiscordPlus

Türkçe konuşan, web panelinden yönetilen yeni nesil Discord moderasyon botu.

> **Durum:** v1 kapsamındaki tüm özellikler (web paneli, moderasyon ve vakalar, gelişmiş loglama, AutoMod) hazır. Gerçek bir sunucuda denemek için [Canlı test kontrol listesi](#canlı-test-kontrol-listesi).

## Neler var?

- **Moderasyon ve vakalar:** yasaklama, susturma, uyarı, toplu temizleme; her işlem numaralı bir vaka olur.
- **AutoMod:** spam, tekrar eden mesaj, küfür (Türkçe'ye özel), davet, link, büyük harf ve toplu etiket filtreleri.
- **Gelişmiş loglama:** mesaj, üye, sunucu ve ses olayları; her kategori ayrı bir kanala gider.
- **Web paneli:** Discord ile giriş yapılır, yetkili olduğunuz her sunucu ayrı ayrı yönetilir. Ayarlar yalnızca panelden yapılır ve bota anında yansır.

## Mimari

```
Discord  ⇄  apps/bot ─┐
                      ├──  PostgreSQL  (ayarlar, vakalar, oturumlar)
Tarayıcı ⇄  apps/web ─┘
```

| Klasör            | İçerik                                                    |
| ----------------- | --------------------------------------------------------- |
| `apps/bot`        | discord.js botu                                           |
| `apps/web`        | Next.js sitesi: tanıtım sayfası, giriş ve panel           |
| `packages/db`     | Drizzle şeması, migration'lar, ortak sorgular             |
| `packages/shared` | Ayar şemaları, süre ayrıştırma, Discord izin yardımcıları |

Panelde bir ayar kaydedildiğinde veritabanı güncellenir ve Postgres `NOTIFY` ile bota haber verilir; bot önbelleğini yeniler.

## Gereksinimler

- Node.js 22.12 veya üstü (önerilen: 24)
- pnpm 10 (`corepack enable` komutu doğru sürümü otomatik kurar)
- PostgreSQL 16 veya üstü (ya da Docker)

## Kurulum

### 1. Discord uygulamasını oluşturun

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
   - Discord, kullanıcı adlarında "discord" kelimesine izin vermez; bot için farklı bir ad seçin (ör. **DPlus**).
2. **General Information** sayfasındaki **Application ID** değerini `.env` dosyasında `DISCORD_CLIENT_ID` olarak kullanın.
3. **Bot** sekmesi:
   - **Reset Token** ile token alın → `DISCORD_TOKEN`.
   - **Privileged Gateway Intents** altında **Server Members Intent** ve **Message Content Intent** seçeneklerini açın.
4. **OAuth2** sekmesi (web paneline giriş için):
   - **Client Secret** → `DISCORD_CLIENT_SECRET`.
   - **Redirects** listesine `http://localhost:3000/api/auth/callback/discord` adresini ekleyin. Üretimde `https://<alan-adınız>/api/auth/callback/discord` adresini de ekleyin.

### 2. Projeyi hazırlayın

```bash
corepack enable
pnpm install
cp .env.example .env   # ardından değerleri doldurun
```

`BETTER_AUTH_SECRET` için rastgele bir değer üretin, örneğin `openssl rand -base64 32`.

### 3. Veritabanını başlatın

```bash
docker compose up -d postgres   # kendi PostgreSQL sunucunuz varsa bu adımı atlayın
pnpm db:migrate
```

### 4. Slash komutlarını kaydedin

```bash
pnpm deploy-commands
```

`.env` içinde `DEV_GUILD_ID` doluysa komutlar yalnızca o test sunucusuna ve anında kaydolur. Boşsa (veya `pnpm deploy-commands --global` ile) tüm sunuculara kaydolur; bu birkaç dakika sürebilir.

### 5. Çalıştırın

```bash
pnpm dev
```

- Web sitesi: <http://localhost:3000>
- Panel: <http://localhost:3000/panel>. Discord ile giriş yapın; sahibi olduğunuz veya Yönetici ya da Sunucuyu Yönet yetkiniz olan sunucular listelenir.
- Botu sunucunuza eklemek için: <http://localhost:3000/davet>

## Docker ile çalıştırma

```bash
docker compose up -d --build
docker compose run --rm bot node dist/deploy-commands.js --global
```

Bu komut PostgreSQL'i başlatır, migration'ları uygular, ardından botu ve web sitesini çalıştırır. Web sitesi `127.0.0.1:3000` adresinde dinler.

Alan adı ve otomatik HTTPS için `.env` dosyasında `DOMAIN` ve `WEB_URL` değerlerini ayarlayın, ardından:

```bash
docker compose --profile production up -d --build
```

## Komutlar

| Komut                  | Açıklama                                                  |
| ---------------------- | --------------------------------------------------------- |
| `pnpm dev`             | Botu ve web sitesini geliştirme modunda çalıştırır        |
| `pnpm build`           | Botu ve web sitesini derler                               |
| `pnpm lint`            | ESLint                                                    |
| `pnpm format`          | Prettier ile biçimlendirir                                |
| `pnpm typecheck`       | TypeScript tip kontrolü                                   |
| `pnpm test`            | Testler (veritabanı testleri bellekte çalışan PGlite ile) |
| `pnpm e2e`             | Web paneli uçtan uca testleri (Playwright)                |
| `pnpm db:generate`     | Şema değişikliğinden migration üretir                     |
| `pnpm db:migrate`      | Migration'ları uygular                                    |
| `pnpm deploy-commands` | Slash komutlarını Discord'a kaydeder                      |

## Bot komutları

| Komut (Türkçe / İngilizce)                           | Açıklama                                                                | Gerekli yetki              |
| ---------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------- |
| `/yasakla` · `/ban`                                  | Süreli veya kalıcı yasak; isteğe bağlı olarak son mesajları siler       | Üyeleri Yasakla            |
| `/yasak-kaldır` · `/unban`                           | Yasağı kaldırır                                                         | Üyeleri Yasakla            |
| `/at` · `/kick`                                      | Üyeyi atar                                                              | Üyeleri At                 |
| `/sustur` · `/timeout`                               | Üyeyi en fazla 28 gün susturur                                          | Üyelere Zaman Aşımı Uygula |
| `/susturma-kaldır` · `/untimeout`                    | Susturmayı kaldırır                                                     | Üyelere Zaman Aşımı Uygula |
| `/uyar` · `/warn`                                    | Uyarı verir; uyarı eşiğine ulaşılırsa ceza otomatik uygulanır           | Üyelere Zaman Aşımı Uygula |
| `/temizle` · `/purge`                                | 1–100 mesajı siler; kullanıcıya veya içeriğe göre filtrelenebilir       | Mesajları Yönet            |
| `/yavaş-mod` · `/slowmode`                           | Kanalın yavaş modunu ayarlar                                            | Kanalları Yönet            |
| `/kilitle` · `/lock`, `/kilit-aç` · `/unlock`        | Kanalı herkese kapatır; açarken önceki izinleri geri yükler             | Kanalları Yönet            |
| `/vaka göster / sebep / sil` · `/case`               | Vakayı gösterir, sebebini değiştirir veya siler (silme: Sunucuyu Yönet) | Üyelere Zaman Aşımı Uygula |
| `/geçmiş` · `/history`, sağ tık → Moderasyon Geçmişi | Kullanıcının vakalarını sayfalı gösterir                                | Üyelere Zaman Aşımı Uygula |
| `/panel`                                             | Sunucunun panel sayfasına bağlantı verir                                | Sunucuyu Yönet             |
| `/ping`, `/yardım` · `/help`                         | Gecikme ve komut listesi                                                | —                          |

Süreler `30sn`, `10dk`, `2sa`, `1g`, `1hf` veya `1g12sa` biçiminde yazılır; komutlar yazarken öneri sunar. Discord arayüzünden elle yapılan yasaklama, atma ve susturmalar da denetim kaydından okunarak vaka olarak kaydedilir.

Komut adları Türkçe Discord istemcisinde Türkçe, diğer dillerde İngilizce görünür (ör. `/yardım` ↔ `/help`).

## Loglar

Panelin **Loglar** sayfasında her kategori için bir kanal seçilir. Kanal seçilmeyen kategori kapalıdır; tüm kategoriler aynı kanala da gönderilebilir.

| Kategori   | Neler loglanır                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Moderasyon | Vakalar (uyarı, susturma, atma, yasaklama), AutoMod müdahaleleri ve panelden yapılan ayar değişiklikleri                                                               |
| Mesaj      | Silinen mesajlar (içerik ve ekler), düzenlenen mesajlar (önce/sonra), toplu silmeler (.txt dökümüyle). `/temizle` ile silinen mesajlar etiketlenir                     |
| Üye        | Katılma (hesap yaşı; 7 günden yeni hesaplar işaretlenir), ayrılma (roller ve sunucuda kalma süresi), takma ad, rol, kullanıcı adı, görünen ad ve avatar değişiklikleri |
| Sunucu     | Kanal ve rol oluşturma, silme ve güncelleme (izin farklarıyla birlikte), sunucu adı ve simgesi değişiklikleri                                                          |
| Ses        | Ses kanalına katılma, ayrılma, kanal değiştirme; sunucu tarafından susturma ve sağırlaştırma                                                                           |

- Log kanallarındaki mesajlar ve botun kendi mesajları hiçbir zaman loglanmaz.
- Yoksayılan kanallardaki mesaj ve ses etkinlikleri loglanmaz. Bir kategori yoksayılırsa içindeki tüm kanallar da yoksayılır. "Botları yoksay" açıkken botların mesajları ve ses etkinlikleri de loglanmaz.
- Mesaj içerikleri veritabanına yazılmaz. Bot son mesajları yalnızca bellekte tutar: varsayılan olarak kanal başına 100 mesaj, en fazla 1 saat (`MESSAGE_CACHE_SIZE`, `MESSAGE_CACHE_LIFETIME_SECONDS`). Daha eski bir mesaj silinirse içeriği gösterilemez.
- Bot seçilen kanalı göremiyor veya oraya yazamıyorsa panel uyarı gösterir. Toplu silme dökümlerinin dosya olarak eklenebilmesi için mesaj log kanalında **Dosya Ekle** yetkisi gerekir.

## AutoMod

Panelin **AutoMod** sayfasından yönetilir. Yeni sunucularda tüm filtreler kapalıdır; **Önerilen ayarları uygula** düğmesi iyi bir başlangıç sağlar (link filtresi hariç hepsini açar).

| Filtre            | Varsayılan eşik                              | Notlar                                                                                                                                         |
| ----------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Spam              | 5 saniyede 5 mesaj                           | Penceredeki mesajların hepsi toplu silinir, ceza bir kez uygulanır                                                                             |
| Tekrar eden mesaj | 30 saniyede aynı mesaj 3 kez                 | Büyük/küçük harf ve boşluk farkları yok sayılır; farklı kanallara gönderilenler de sayılır                                                     |
| Küfür             | Türkçe liste + sunucuya özel kelimeler       | `s1kt1r`, `siiiik`, `s i k`, `a.m.k` gibi yazımlar ve benzer görünen harfler yakalanır; "sıkıntı", "ama", "götürmek" gibi kelimeler yakalanmaz |
| Davet linki       | —                                            | Sunucunun kendi davetleri serbesttir (kapatılabilir)                                                                                           |
| Link              | İzin listesi: Discord, YouTube, Tenor, Giphy | İzin listesi veya yasak listesi modu; alt alan adları da kapsanır                                                                              |
| Büyük harf        | 10 harften uzun mesajda %70                  | Etiketler, emojiler ve linkler hesaba katılmaz                                                                                                 |
| Toplu etiket      | Tek mesajda 5 farklı kullanıcı veya rol      |                                                                                                                                                |

- **Eylemler:** sadece logla, sil, sil + uyar, sil + sustur, sil + at, sil + yasakla. Cezalar moderasyon komutlarıyla aynı yoldan geçer: kullanıcıya DM gider, vaka açılır, mod-log'a düşer ve uyarı eşikleri devreye girer. Vaka açılmayan müdahaleler mod-log'a AutoMod kaydı olarak düşer.
- **Muafiyetler:** kanalda Mesajları Yönet yetkisi olanlar ve yöneticiler (kapatılabilir), seçilen roller, kanallar ve kategoriler. Botlar ve webhook mesajları hiçbir zaman denetlenmez.
- Düzenlenen mesajlar da küfür, davet, link, büyük harf ve etiket filtrelerinden yeniden geçer.
- Mesaj silindiğinde kanala kısa bir not düşülür ve birkaç saniye sonra kendini siler (kapatılabilir). Silinen mesajlar mesaj logunda "AutoMod: …" etiketiyle görünür.
- Küfür listesinde bir kelimenin sonuna `*` eklenirse o kökle başlayan tüm kelimeler eşleşir (ör. `aptal*`). Yanlışlıkla yakalanan kelimeler "İzin verilen kelimeler" listesine eklenebilir.

## Canlı test kontrol listesi

Kurulumdan sonra bir test sunucusunda şunları deneyin (botun rolünü, cezalandırılacak test hesabının rolünden yukarı taşıyın):

1. **Giriş ve panel:** <http://localhost:3000/panel> → sunucunuz "Yönet" ile görünüyor; botun olmadığı sunucularda "Botu Ekle" çıkıyor.
2. **Moderasyon:** `/uyar`, `/sustur` (süre: `1dk`) ve `/yasakla` (süre: `1dk`) çalışıyor; vakalar mod-log kanalına ve panelin Vakalar sayfasına düşüyor. 1 dakikalık yasak kendiliğinden kalkıyor. Discord arayüzünden elle yapılan bir yasaklama da vaka oluyor.
3. **Ayarların anında geçmesi:** Panelde mod-log kanalını değiştirin; bir sonraki vaka hemen yeni kanala gidiyor ve mod-log'a "ayarları web panelinden güncellendi" notu düşüyor.
4. **Loglar:** Bir mesajı düzenleyin ve silin, `/temizle miktar:5` çalıştırın (döküm dosyası ekleniyor mu?), bir rolün iznini değiştirin, ses kanalına girip çıkın; her biri seçtiğiniz log kanalına düşüyor.
5. **AutoMod:** "Moderatörleri muaf tut" ayarını geçici olarak kapatın ya da yetkisiz bir hesap kullanın. Ardından her filtreyi tetikleyin: hızlı mesajlar, aynı mesajı tekrar etmek, küfür, başka sunucunun davet linki, izin verilmeyen bir link, büyük harfli uzun bir mesaj, 5 kişiyi etiketlemek. Mesajlar siliniyor, kanala kısa not düşüyor ve seçilen ceza uygulanıyor mu?

## Uçtan uca testler

Web paneli testleri, üretim derlemesine karşı sahte bir Discord API'si ve test oturumlarıyla çalışır; gerçek Discord hesabı gerekmez. Bir PostgreSQL sunucusu gerekir.

```bash
pnpm --filter @discordplus/web exec playwright install chromium   # ilk seferde
pnpm build
pnpm e2e
```

Varsayılan veritabanı `postgres://discordplus:discordplus@localhost:5432/discordplus_e2e`; farklıysa `E2E_DATABASE_URL` ile belirtin. Veritabanı yoksa otomatik oluşturulur.

## Yol haritası

- [x] **Faz 0:** Monorepo, veritabanı, bot ve site iskeleti, Docker, CI
- [x] **Faz 1:** Discord ile giriş ve sunucu listesi
- [x] **Faz 2:** Temel moderasyon ve vaka sistemi
- [x] **Faz 3:** Gelişmiş loglama
- [x] **Faz 4:** AutoMod
- [ ] **Sonrası:** anti-raid ve doğrulama, AI destekli moderasyon, panelde rol bazlı erişim, İngilizce dil desteği
