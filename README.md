# Auricular AI Atlas — Firebase başlangıç sürümü

1. `firebase-config.js` içindeki altı Firebase web config değerini doldurun.
2. Firebase Console > Authentication > Sign-in method > Email/Password etkin olsun. Users > Add user ile hesap oluşturun.
3. Firebase Console > Firestore Database > Rules alanına `firestore.rules` içeriğini yapıştırıp Publish yapın.
4. Yönetici atamak için Firebase Console > Project settings > Service accounts > Generate new private key ile JSON dosyasını **yalnızca kendi bilgisayarınıza** indirin ve `admin-tools/service-account.json` adıyla kaydedin. Bu dosyayı GitHub'a ASLA yüklemeyin.
5. VS Code terminalinde `cd admin-tools`, `npm install`, `node set-admin.cjs FIREBASE_USER_UID` çalıştırın. UID'yi Authentication > Users sayfasından alın. Sonra `cd ..`.
6. VS Code Live Server ile `index.html` açın. E-posta ve şifrenizle giriş yapın. Yetki yeni atandıysa çıkış yapıp tekrar giriş yapın.
7. Authentication > Settings > Authorized domains alanında uygulamanızın gerçek yayın alan adını yetkilendirin.

İlk sürümde resimler `https://` URL olarak girilir; Firebase Storage dosya yükleme henüz yoktur. Tedavi protokolleri ve yapay zekâ modülleri sonraki geliştirme aşamasıdır.

Not: Service account JSON dosyasını ve `admin-tools` içindeki yönetim betiğini web sunucusuna yüklemeyin; `admin-tools` klasörünü yalnızca yerel bilgisayarınızda kullanın. GitHub Pages'e dağıtım yaparken yalnızca web dosyalarını yayınlayın. Gerçek klinik hasta bilgilerini bu eğitim prototipine girmeyin.
