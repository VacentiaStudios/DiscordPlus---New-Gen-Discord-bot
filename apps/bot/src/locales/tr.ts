// Every user-facing string of the bot lives here.

export const tr = {
  errors: {
    unexpected:
      'Beklenmeyen bir hata oluştu. Sorun devam ederse sunucu yöneticisine haber verin. (Hata kodu: {id})',
    guildOnly: 'Bu komut yalnızca sunucularda kullanılabilir.',
    unknownCommand: 'Bu komut artık mevcut değil.',
    missingPermissions:
      'Botun bu işlem için yetkisi yok. Botun rolünün gerekli izinlere sahip olduğundan ve hedefin rolünden yukarıda olduğundan emin olun.',
    missingAccess: 'Bot bu kanala veya kaynağa erişemiyor.',
    unknownMember: 'Bu kullanıcı sunucuda bulunamadı.',
    unknownUser: 'Bu kullanıcı bulunamadı.',
    unknownBan: 'Bu kullanıcı yasaklı değil.',
    unknownMessage: 'Mesaj bulunamadı; silinmiş olabilir.',
    unknownChannel: 'Kanal bulunamadı.',
    cannotDm: 'Kullanıcıya özel mesaj gönderilemiyor.',
    componentExpired: 'Bu düğmenin süresi doldu. Komutu yeniden çalıştırın.',
  },
  general: {
    pingDescription: 'Botun gecikmesini gösterir.',
    pinging: 'Ölçülüyor…',
    pong: (gatewayMs: number, roundTripMs: number) =>
      `🏓 Pong! Gateway: **${gatewayMs >= 0 ? `${gatewayMs} ms` : 'ölçülüyor'}** · Yanıt süresi: **${roundTripMs} ms**`,
    helpDescription: 'Komutları ve panel bağlantısını gösterir.',
    helpTitle: 'DiscordPlus komutları',
    helpPanel: (url: string) => `Botun tüm ayarları web panelinden yapılır: [Paneli aç](${url})`,
    helpFooter: 'Komut adları Türkçe Discord istemcisinde Türkçe görünür.',
  },
  panel: {
    description: 'Bu sunucunun web paneli bağlantısını gösterir.',
    message:
      'Botun tüm ayarlarını web panelinden yapabilirsiniz. Panele Discord hesabınızla giriş yapın; Sunucuyu Yönet yetkisine sahip olmanız gerekir.',
    button: 'Paneli aç',
    settingsChanged: (section: string, actorId: string, actorName: string) =>
      `⚙️ **${section}** ayarları web panelinden güncellendi · <@${actorId}> (${actorName})`,
  },
  permissions: {
    member: (names: string) => `Bu komutu kullanmak için **${names}** yetkiniz olmalı.`,
    bot: (names: string) => `Botun **${names}** yetkisi yok.`,
  },
  hierarchy: {
    self: 'Bu işlemi kendinize uygulayamazsınız.',
    bot: 'Bu işlemi bota uygulayamazsınız.',
    owner: 'Bu işlem sunucu sahibine uygulanamaz.',
    moderatorRole: 'Bu kullanıcının en yüksek rolü sizinkiyle aynı seviyede veya daha yüksek.',
    botRole:
      'Bu kullanıcının en yüksek rolü botunkiyle aynı seviyede veya daha yüksek. Sunucu Ayarları → Roller bölümünden botun rolünü yukarı taşıyın.',
  },
  duration: {
    invalid: 'Geçersiz süre. Örnekler: 30sn, 10dk, 2sa, 1g, 1hf, 1g12sa',
    tooShort: (min: string) => `Süre en az ${min} olmalı.`,
    tooLong: (max: string) => `Süre en fazla ${max} olabilir.`,
  },
  moderation: {
    noReason: 'Sebep belirtilmedi',
    permanent: 'Kalıcı',
    dmFailed: 'Kullanıcıya özel mesaj gönderilemedi.',
    thresholdReason: (count: number, caseNumber: number) =>
      `${count} uyarıya ulaşıldı (Vaka #${caseNumber})`,
    tempBanExpired: (caseNumber: number) => `Süreli yasak sona erdi (Vaka #${caseNumber})`,
    escalated: (count: number, action: string, caseNumber: number) =>
      `Bu kullanıcının **${count}** aktif uyarısı var; uyarı eşiği nedeniyle **${action}** (Vaka #${caseNumber}).`,
    escalationFailed: (count: number) =>
      `Bu kullanıcının **${count}** aktif uyarısı var; uyarı eşiğindeki ceza uygulanamadı (botun yetkisini kontrol edin).`,
    activeWarnings: (count: number) => `Aktif uyarı sayısı: **${count}**`,
    done: {
      warn: (user: string, n: number) => `**${user}** uyarıldı. (Vaka #${n})`,
      timeout: (user: string, duration: string, n: number) =>
        `**${user}** ${duration} boyunca susturuldu. (Vaka #${n})`,
      untimeout: (user: string, n: number) =>
        `**${user}** kullanıcısının susturması kaldırıldı. (Vaka #${n})`,
      kick: (user: string, n: number) => `**${user}** sunucudan atıldı. (Vaka #${n})`,
      ban: (user: string, n: number) => `**${user}** kalıcı olarak yasaklandı. (Vaka #${n})`,
      tempBan: (user: string, duration: string, n: number) =>
        `**${user}** ${duration} süreyle yasaklandı. (Vaka #${n})`,
      unban: (user: string, n: number) =>
        `**${user}** kullanıcısının yasağı kaldırıldı. (Vaka #${n})`,
    },
    dm: {
      warn: (guild: string) => `**${guild}** sunucusunda uyarı aldınız.`,
      timeout: (guild: string, duration: string) =>
        `**${guild}** sunucusunda **${duration}** boyunca susturuldunuz.`,
      kick: (guild: string) => `**${guild}** sunucusundan atıldınız.`,
      ban: (guild: string) => `**${guild}** sunucusundan kalıcı olarak yasaklandınız.`,
      tempBan: (guild: string, duration: string) =>
        `**${guild}** sunucusundan **${duration}** süreyle yasaklandınız.`,
      reason: 'Sebep',
    },
    errors: {
      notMember: 'Bu kullanıcı sunucuda değil.',
      alreadyBanned: 'Bu kullanıcı zaten yasaklı.',
      notTimedOut: 'Bu kullanıcı susturulmuş değil.',
      cannotTimeoutAdmin: 'Yönetici yetkisine sahip üyeler susturulamaz.',
      caseNotFound: (n: number) => `Vaka #${n} bulunamadı.`,
      caseDeleted: (n: number) => `Vaka #${n} silinmiş.`,
      deleteNeedsManageGuild: 'Vaka silmek için **Sunucuyu Yönet** yetkisi gerekir.',
      textChannelOnly: 'Bu komut yalnızca metin kanallarında kullanılabilir.',
      alreadyLocked: 'Bu kanal zaten kilitli.',
      notLocked: 'Bu kanal DiscordPlus ile kilitlenmemiş.',
      slowmodeTooLong: 'Yavaş mod en fazla 6 saat olabilir.',
      nothingToPurge: 'Silinecek uygun mesaj bulunamadı (14 günden eski mesajlar silinemez).',
    },
    commands: {
      ban: {
        description: 'Bir kullanıcıyı sunucudan yasaklar (süreli veya kalıcı).',
        user: 'Yasaklanacak kullanıcı (sunucuda olmasa da ID ile seçilebilir)',
        reason: 'Yasaklama sebebi',
        duration: 'Süreli yasak için süre (ör. 1g, 1hf). Boş bırakılırsa kalıcı olur.',
        deleteMessages: 'Kullanıcının son mesajlarını sil',
        deleteNone: 'Silme',
        deleteHour: 'Son 1 saat',
        deleteDay: 'Son 24 saat',
        deleteWeek: 'Son 7 gün',
      },
      unban: {
        description: 'Bir kullanıcının yasağını kaldırır.',
        user: 'Yasağı kaldırılacak kullanıcı (ID ile seçebilirsiniz)',
        reason: 'Sebep',
      },
      kick: {
        description: 'Bir üyeyi sunucudan atar.',
        user: 'Atılacak üye',
        reason: 'Atma sebebi',
      },
      timeout: {
        description: 'Bir üyeyi belirli bir süre susturur (en fazla 28 gün).',
        user: 'Susturulacak üye',
        duration: 'Süre (ör. 10dk, 2sa, 1g)',
        reason: 'Susturma sebebi',
      },
      untimeout: {
        description: 'Bir üyenin susturmasını kaldırır.',
        user: 'Susturması kaldırılacak üye',
        reason: 'Sebep',
      },
      warn: {
        description: 'Bir üyeyi uyarır; uyarı eşiklerine ulaşılırsa otomatik ceza uygulanır.',
        user: 'Uyarılacak üye',
        reason: 'Uyarı sebebi',
      },
      purge: {
        description: 'Bu kanaldaki son mesajları toplu olarak siler.',
        amount: 'Silinecek mesaj sayısı (1-100)',
        user: 'Yalnızca bu kullanıcının mesajları',
        contains: 'Yalnızca bu metni içeren mesajlar',
        done: (count: number) => `🧹 **${count}** mesaj silindi.`,
        partial: (count: number, requested: number) =>
          `🧹 **${count}** mesaj silindi (${requested} istendi; eşleşen veya 14 günden yeni mesaj bu kadardı).`,
      },
      slowmode: {
        description: 'Kanalın yavaş mod süresini ayarlar.',
        duration: 'Süre (ör. 10sn, 1dk, 1sa) veya kapatmak için 0',
        channel: 'Kanal (boş bırakılırsa bu kanal)',
        off: 'Kapalı',
        enabled: (channel: string, duration: string) =>
          `🐢 ${channel} için yavaş mod: **${duration}**.`,
        disabled: (channel: string) => `🐢 ${channel} için yavaş mod kapatıldı.`,
      },
      lock: {
        description: 'Kanalı herkese kapatır: @everyone mesaj gönderemez.',
        channel: 'Kanal (boş bırakılırsa bu kanal)',
        reason: 'Sebep',
        done: (channel: string) => `🔒 ${channel} kilitlendi.`,
        notice: '🔒 Bu kanal moderatörler tarafından geçici olarak kilitlendi.',
      },
      unlock: {
        description: 'Kanalın kilidini açar ve önceki izinleri geri yükler.',
        channel: 'Kanal (boş bırakılırsa bu kanal)',
        reason: 'Sebep',
        done: (channel: string) => `🔓 ${channel} kilidi açıldı.`,
        notice: '🔓 Bu kanalın kilidi açıldı.',
      },
      case: {
        description: 'Moderasyon vakalarını görüntüler ve düzenler.',
        show: 'Bir vakayı gösterir',
        reasonSub: 'Bir vakanın sebebini değiştirir',
        delete: 'Bir vakayı siler (Sunucuyu Yönet yetkisi gerekir)',
        number: 'Vaka numarası',
        reason: 'Yeni sebep',
        reasonUpdated: (n: number) => `Vaka #${n} sebebi güncellendi.`,
        deleted: (n: number) => `Vaka #${n} silindi.`,
        openInPanel: 'Panelde aç',
      },
      history: {
        description: 'Bir kullanıcının moderasyon geçmişini gösterir.',
        user: 'Kullanıcı',
        contextName: 'Moderation History',
        contextNameTr: 'Moderasyon Geçmişi',
        title: (user: string) => `${user} · moderasyon geçmişi`,
        empty: 'Bu kullanıcının hiç vakası yok.',
        page: (page: number, pages: number) => `Sayfa ${page}/${pages}`,
        previous: 'Önceki',
        next: 'Sonraki',
      },
    },
    log: {
      user: 'Kullanıcı',
      moderator: 'Moderatör',
      duration: 'Süre',
      ends: 'Bitiş',
      reason: 'Sebep',
      source: 'Kaynak',
      deleted: 'silindi',
      deletedBy: (id: string) => `Silen: <@${id}>`,
    },
  },
} as const;

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
