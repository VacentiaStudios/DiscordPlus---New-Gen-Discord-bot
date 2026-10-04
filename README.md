# DiscordPlus

Türkçe konuşan, web panelinden yönetilen yeni nesil Discord moderasyon botu.

> **Durum:** Geliştirme aşamasında. Altyapı (Faz 0) hazır; özellikler fazlar hâlinde ekleniyor. Ayrıntılar için [Yol haritası](#yol-haritası).

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

### 2. Projeyi hazırlayın

```bash
corepack enable
pnpm install
cp .env.example .env   # ardından değerleri doldurun
```

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
| `pnpm db:generate`     | Şema değişikliğinden migration üretir                     |
| `pnpm db:migrate`      | Migration'ları uygular                                    |
| `pnpm deploy-commands` | Slash komutlarını Discord'a kaydeder                      |

## Bot komutları

| Komut     | Açıklama                                       |
| --------- | ---------------------------------------------- |
| `/ping`   | Botun gecikmesini gösterir                     |
| `/yardım` | Komut listesini ve panel bağlantısını gösterir |

Komut adları Türkçe Discord istemcisinde Türkçe, diğer dillerde İngilizce görünür (ör. `/yardım` ↔ `/help`).

## Yol haritası

- [x] **Faz 0:** Monorepo, veritabanı, bot ve site iskeleti, Docker, CI
- [ ] **Faz 1:** Discord ile giriş ve sunucu listesi
- [ ] **Faz 2:** Temel moderasyon ve vaka sistemi
- [ ] **Faz 3:** Gelişmiş loglama
- [ ] **Faz 4:** AutoMod
- [ ] **Sonrası:** anti-raid ve doğrulama, AI destekli moderasyon, panelde rol bazlı erişim, İngilizce dil desteği
