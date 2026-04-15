# Analisis Pengalaman Pengguna untuk Aplikasi E-Commerce Mobile

## 1. Ringkasan Eksekutif

## 2. Konteks dan Asumsi

Aplikasi ini adalah aplikasi mobile e-commerce konsumer yang dirancang untuk memberikan pengalaman belanja online yang mulus, dengan fitur utama seperti browsing produk, keranjang belanja, checkout pembayaran, dan rekomendasi produk berbasis algoritma. Model bisnis menggunakan pendekatan freemium: fitur dasar (seperti browsing katalog, menambah ke keranjang, dan pembayaran standar) tersedia gratis untuk menarik pengguna, sementara fitur premium (seperti diskon eksklusif, pengiriman gratis, rekomendasi personal, dan notifikasi prioritas) memerlukan langganan atau pembelian satu kali.

**Target Pengguna:** Konsumer urban di Indonesia dan pasar Asia Tenggara, usia 18-45 tahun, dengan tingkat literasi digital sedang hingga tinggi. Segmentasi utama:
- Pemula belanja online: Mencari kemudahan dan keamanan transaksi.
- Shopper reguler: Fokus pada efisiensi waktu dan personalisasi.
- Power user: Mencari deal terbaik dan fitur canggih.

**Platform:** Aplikasi native untuk iOS (versi minimum 13.0) dan Android (versi minimum 8.0) untuk memastikan performa tinggi dan akses ke fitur device-specific seperti NFC untuk pembayaran.

**Model Bisnis:** Freemium dengan monetisasi melalui komisi penjualan, iklan, dan langganan premium. Tidak ada asumsi tentang skala besar awal; fokus pada pertumbuhan organik melalui UX yang unggul.

**Batasan Teknis dan Regulasi:** Tidak ada integrasi legacy atau sistem warisan; aplikasi dibangun dari nol. Patuhi regulasi privasi seperti GDPR (jika ekspansi ke Eropa), PDPL di Indonesia, dan CCPA di AS. Tidak ada batasan pada teknologi open-source, tapi hindari dependensi pada vendor proprietary untuk fleksibilitas. Asumsi tidak ada kendala anggaran besar, dengan prioritas pada investasi UX untuk meningkatkan retensi pengguna (target retensi 60% pada bulan pertama) dan konversi pembelian (target 15% conversion rate).

## 3. Persona Pengguna dan Skenario Utama Penggunaan

### Persona 1: Anna (Pemula Belanja Online)
- **Demografi:** Wanita, 25 tahun, single, pekerja kantor di Jakarta.
- **Kebutuhan:** Belanja fashion dan kosmetik dengan mudah, tanpa risiko keamanan. Ingin panduan untuk memilih produk.
- **Frustrasi:** Proses checkout yang rumit, app yang lambat loading, kurangnya tutorial untuk fitur baru.
- **Tujuan:** Membeli pakaian trendi dengan cepat saat diskon, meningkatkan kepercayaan pada platform.
- **Alur Utama:** Buka app → Jelajahi kategori fashion → Lihat rekomendasi → Tambah ke keranjang → Checkout dengan satu klik → Bayar via e-wallet.

### Persona 2: Budi (Shopper Reguler)
- **Demografi:** Pria, 35 tahun, menikah, wiraswasta di Surabaya.
- **Kebutuhan:** Efisiensi waktu untuk belanja bulanan keluarga, personalisasi berdasarkan riwayat belanja.
- **Frustrasi:** Notifikasi berlebihan, kesulitan menemukan produk spesifik, ongkos kirim tinggi tanpa premium.
- **Tujuan:** Menghemat waktu dan uang melalui diskon otomatis dan pengiriman cepat.
- **Alur Utama:** Login → Lihat wishlist dan rekomendasi personal → Bandingkan harga → Tambah multiple item ke keranjang → Gunakan kode promo → Checkout dengan alamat tersimpan → Tracking pesanan real-time.

### Persona 3: Cindy (Power User)
- **Demografi:** Wanita, 20 tahun, mahasiswa di Bandung, aktif di sosial media.
- **Kebutuhan:** Temukan produk unik dan viral, berbagi ulasan, fitur AR untuk coba produk.
- **Frustrasi:** Kurangnya fitur sosial (seperti wishlist bersama), app crash saat upload foto.
- **Tujuan:** Jadi influencer mikro, dapatkan poin reward dari ulasan dan referral.
- **Alur Utama:** Jelajahi trending products → Gunakan AR untuk visualisasi → Bagikan ke sosial media → Tambah ke keranjang → Upgrade ke premium untuk free shipping → Bayar dan beri ulasan dengan foto.

### Persona 4: Dedi (Budget-Conscious Shopper)
- **Demografi:** Pria, 40 tahun, kepala keluarga di Medan, pekerja pabrik.
- **Kebutuhan:** Cari deal terbaik dan produk murah berkualitas, tracking pengeluaran.
- **Frustrasi:** Ads yang mengganggu, kurangnya filter harga yang akurat, biaya tersembunyi.
- **Tujuan:** Maksimalkan value dengan anggaran terbatas, hindari over-spending.
- **Alur Utama:** Filter produk berdasarkan harga rendah → Lihat ulasan dan rating → Tambah ke keranjang → Gunakan fitur compare → Checkout dengan metode pembayaran cicilan → Monitor pengeluaran via dashboard.

## 4. Analisis UX/UI

### 4.1 Penilaian Heuristik (Nielsen)

Penilaian berdasarkan 10 prinsip heuristik Nielsen untuk usability. Masalah kritis yang sering muncul di aplikasi e-commerce: visibility sistem yang buruk (loading tanpa indikator), mismatch dengan dunia nyata (istilah teknis), kurangnya kontrol (no undo), inkonsistensi (ikon berbeda untuk fungsi sama), dan desain yang cluttered.

**Rekomendasi Utama:**
- **Visibility (1):** Gunakan progress bars untuk loading, badge notifikasi untuk keranjang.
- **Match Real World (2):** Copywriting sederhana, ikon intuitif (keranjang untuk add to cart).
- **User Control (3):** Tambah tombol undo untuk remove item, exit tanpa konfirmasi berlebihan.
- **Consistency (4):** Standarisasi warna dan font, ikuti Material Design/Google Design.
- **Error Prevention (5):** Validasi input real-time, disable submit jika form incomplete.
- **Recognition (6):** Tampilkan riwayat pencarian, autocomplete untuk search.
- **Flexibility (7):** Shortcuts untuk power users, seperti swipe to delete.
- **Aesthetic (8):** Minimalist: maks 3 CTA per screen, spacing 8pt grid.
- **Error Recovery (9):** Pesan error jelas dengan solusi, e.g., "Password salah, reset via email?"
- **Help (10):** In-app tutorial untuk fitur baru, searchable FAQ.

### 4.2 Onboarding

Langkah ideal onboarding: 4-5 layar dalam <1 menit.
1. Welcome: Value prop "Belanja mudah, hemat waktu".
2. Permissions: Jelaskan manfaat location untuk pengiriman, notifications untuk promo.
3. Preferences: Pilih kategori minat (fashion, elektronik).
4. Tutorial: Swipe demo untuk add to cart dan checkout.
5. Finish: CTA "Mulai Belanja".

Metrik sukses: Completion rate >80%, drop-off <20% per step. Jika <70%, tambah skip button dan track via analytics.

Rekomendasi: Interactive elements (tap to continue), video pendek, personalize berdasarkan persona (e.g., fokus deal untuk Dedi). Uji A/B untuk urutan layar.

### 4.3 Navigasi, Arsitektur Informasi, Mikrointeraksi, Copywriting UX

**Navigasi:** Bottom tab bar (Home, Search, Cart, Profile) untuk thumb reach. Drawer menu untuk settings. Deep linking untuk push notifications.

**Arsitektur Informasi:** Hierarchical flat: Home > Category > Product > Detail. Breadcrumb pada web, back button pada mobile.

**Mikrointeraksi:** Swipe to delete cart item, haptic vibration pada success add, micro-animations (bounce pada like).

**Copywriting UX:** Jelas dan actionable: "Simpan untuk Nanti" bukan "Bookmark". Error: "Ups, koneksi gagal. Coba lagi?" Konsisten tone: Friendly, seperti "Temukan deal impianmu!"

Rekomendasi: Test heatmaps untuk touch targets >44pt.

### 4.4 Personalisasi dan Adaptivitas Pengalaman

Personalisasi: Rekomendasi produk berdasarkan browsing history dan purchases, menggunakan collaborative filtering. Adaptive: Dark mode otomatis, font scaling untuk low vision, layout responsive untuk tablet.

Rekomendasi: Collect data with consent, A/B test rec algorithms. Metric: Click-through rate >20% pada recs.

### 4.5 Rekomendasi Desain UI Konkret

**Komponen Utama:**
- Buttons: Primary blue (#007AFF), rounded corners 8pt, height 48pt, font 16pt bold.
- Cards: Shadow 4pt, image 1:1 aspect, title 14pt, price 16pt red.
- FAB: Circular, bottom right, untuk add to cart.

**Prioritas Layar:**
1. Home: Hero banner full-width, grid categories 2x4, recommendations carousel.
2. Product Detail: Image gallery swipe, specs expandable, CTA "Beli Sekarang" prominent.
3. Checkout: Stepper progress bar, form auto-fill.

**Keterbacaan dan Kejelasan:** Font Inter/San Francisco, size min 16pt, contrast 7:1, color palette limited to 5 colors. Icon with labels, avoid jargon.

## 5. Aksesibilitas dan Lokalisasi

**WCAG 2.1 Level AA Utama:**
- **Perceivable:** Alt text untuk images, captions untuk video, contrast ratio 4.5:1.
- **Operable:** Keyboard navigation, touch targets 44pt min, no auto-play.
- **Understandable:** Language jelas, error messages helpful, consistent navigation.
- **Robust:** Semantic markup, screen reader support (VoiceOver, TalkBack).

Rekomendasi: Audit dengan tools seperti axe-core, test dengan users disabilities. Metric: Accessibility score >90% via Lighthouse.

**Lokalisasi:** Bahasa utama Indonesia, support English. Format tanggal DD/MM/YYYY, currency IDR (Rp), angka 1.000.000. RTL: Tidak diperlukan, tapi siapkan untuk ekspansi (e.g., Arabic).

Rekomendasi: Implement i18n library (react-i18next), crowdsource translations, test dengan native speakers. Jika multi-region, auto-detect locale.

## 6. Performa dan Reliabilitas

**KPI Performa Relevan:**
- Startup time: Cold <3s, hot <1s.
- Frame drops: <1% (target 60fps).
- Time to interactive: <5s untuk home screen.
- Network latency: <500ms average.

**Teknik Optimisasi:**
- Lazy loading: Images load on viewport.
- Caching: API responses cached 24h, images with FastImage.
- Compression: WebP for images, minify JS.
- Offline-first: Sync cart/orders when online.

Rekomendasi: Monitor dengan Firebase Performance, target uptime 99.9%, load test 10k users. Metric: Apdex score >0.8.

## 7. Keamanan & Privasi

**Praktik Terbaik:**
- Otentikasi: Biometric (Face ID/Touch ID) + PIN, OAuth untuk login sosial.
- Enkripsi: Data in transit (TLS 1.3), at rest (AES-256).
- Minimisasi Data: Collect only email, address, payment for transactions; anonymize analytics.
- Consent Flows: Granular opt-in for marketing, easy opt-out.

**Regulasi:**
- GDPR: Consent, data portability, right to erasure.
- PDPL: Data protection, breach notification.
- CCPA: Privacy rights, do not sell data.

Rekomendasi Implementasi: Use HTTPS, regular security audits, in-app privacy settings. Metric: Zero data breaches, consent rate >90%.

## 8. Analisis Kompetitif Singkat

**Pesaing 1: Shopee**
- Kekuatan: Gamification (Shopee Coins), free shipping threshold rendah, live streaming.
- Kelemahan: Ads berlebihan, UI cluttered, sering crash saat peak.
- Peluang Diferensiasi: Fokus no-ads untuk free users, UX lebih clean.

**Pesaing 2: Tokopedia**
- Kekuatan: Marketplace lokal terpercaya, integrasi payment (GoPay), official stores.
- Kelemahan: Loading lambat, UI outdated, kurang personalisasi.
- Peluang Diferensiai: AI recommendations lebih akurat, onboarding smoother.

**Pesaing 3: Lazada**
- Kekuatan: Brands internasional, AR try-on, flash sales.
- Kelemahan: Shipping mahal, kurang engagement, app size besar.
- Peluang Diferensiasi: Offline-first untuk rural users, premium features tanpa bloat.

Rekomendasi: Benchmark UX dengan App Annie, diferensiasi melalui personalisasi dan performa superior.

## 9. Metode Pengukuran & Metrik Produk

**KPI Utama (AARRR + Engagement):**
- Acquisition: Downloads per bulan (target awal: 10.000), cost per install < $2.
- Activation: Onboarding completion rate (target: 80%), time to first purchase <7 hari.
- Retention: DAU/MAU ratio (target: 0.6), churn rate <40% bulan pertama.
- Revenue: Conversion rate (target: 15%), average order value Rp 200.000.
- Referral: Shares/referrals per user (target: 0.5), viral coefficient >1.
- Engagement: Session time average (target: 5 min), screen views per session (target: 10).
- NPS (Net Promoter Score): Target 50, frekuensi monthly.
- CES (Customer Effort Score): Target 4/5, frekuensi quarterly.

**Rencana Dashboard & Event Tracking:**
Dashboard: Firebase Analytics + custom Mixpanel untuk real-time metrics.
Event Utama: User_login, product_view, add_to_cart, checkout_start, purchase_complete, app_crash.
Frekuensi Pelaporan: Daily alerts untuk errors, weekly summary, monthly deep dive.

## 10. Rencana Pengujian Pengguna dan Validasi

## 11. Roadmap Fitur dan Prioritas

## 12. Pertimbangan Teknis dan Arsitektur Tinggi

## 13. Estimasi Sumber Daya & Waktu

## 14. Daftar Pemeriksaan Peluncuran & Pasca-Peluncuran

## 15. Prioritized Action List

## 16. Referensi, Contoh Desain/Pola, dan Lampiran

### Lampiran: Wireframe Ide Dasar untuk 3 Layar Kritis