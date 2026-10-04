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
  },
} as const;

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
