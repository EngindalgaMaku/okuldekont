const XLSX = require('xlsx');
const path = require('path');

const rawCSV = `12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",11,Miraç Berat Ortakcı,Mustafa Zeybekoğlu,Özdener Uğur / Net Bilişim,Meltem Mah. Falez Sit. Toros Apt. No:183/B Konyaaltı ANTALYA,5062370024
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",40,Miraç Berk Çakuş,Bekir Arık,AdviceAl Online Turizm Danışmanlık Tur. San. Tic. A.Ş.,Pınarbaşı Mah. Hürriyet Cad. Akdeniz Üniv. Teknokent AR-GE No:3A/105 Konyaaltı ANTALYA,2426061991
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",61,Emirhan Hazıroğlu,Bekir Arık,Tel-Post Ltd. Şti.,Pınarbaşı Mah. Hürriyet Cad. Akdeniz Üniv. Teknokent AR-GE No:38/31 Konyaaltı ANTALYA,2423123959
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",63,Alper Yıldız,Nazmiye Tuncer,Bülent Açıl / Andem Eğitim,Varlık Mah. 100. Yıl Bulvarı Işıldar Apt. No: 59/9 Muratpaşa ANTALYA,5337705862
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",87,Zeynep Erol,Yusuf Kurt,Erasta Edirne Emlak Geliştirme ve Yatırım AŞ.,Fabrikalar Mah. Dumlupınar Bulv. No:49 Kepez ANTALYA,2423453540
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",128,Büşra Ateş,Yusuf Kurt,Gürateş Yangın Güvenlik Ses Işık Sistemleri Ltd. Şti.,Cumhuriyet Mah. 620 Sok. No:36A Muratpaşa ANTALYA,5396175525
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",154,Alpaslan İsmail Soytaş,Bekir Arık,Döşemealtı Belediye Başkanlığı,Yeniköy Atatürk Cad. No:521 Döşemealtı ANTALYA,4440507
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",208,Alperen Sapmaz,Engin Dalga,Meltem Ozalit Kırtasiye San. Tic. Ltd. Şti.,Meltem Mah. Meltem Bulv. Çağrı 4 Sit. No:13/BA Muratpaşa ANTALYA,5302203077
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",222,Emir Şafak,Engin Dalga,Piksel Matbaa San. Tic. Ltd. Şti.,Elmalı Mah. Hasan Subaşı Cad. 14. Sok. Koçlar İşhanı No:31/B Muratpaşa ANTALYA,5334653077
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",289,Halit Miraç Aşıkoğlu,Bediz İliç,Antalya Cumhuriyet Başsavcılığı,"Meltem, Dumlupınar Blv. No:175, 07030 Muratpaşa ANTALYA",2422463000
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",347,Hüseyin Görmez,Engin Dalga,Deniz Şimşek / Alternatif Bilgisayar,Kızılsarday Mah. Milli Egemenlik Cad. Özkan Apt. No:21/D Muratpaşa ANTALYA,5422487599
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",349,Kazım Mikail Türkan,Engin Dalga,Meltem Ozalit Kırtasiye San. Tic. Ltd. Şti.,Meltem Mah. Meltem Bulv. Çağrı 4 Sit. No:13/BA Muratpaşa ANTALYA,5302203077
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",351,Süleyman Deveci,Bekir Arık,Hastalya Otomotiv Yatırım Paz. A.Ş.,"Altınkale Mahallesi Akdeniz Bulvarı No:205, Döşemealtı ANTALYA",5448439449
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",584,Emre Başkaya,Yusuf Kurt,Başaran Otomotiv Otelcilik Turizm İnş. San. Tic. AŞ.,Altınova Sinan Mah. Serik Cad. No:161 Kepez ANTALYA,2423108700
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",657,Yiğit Şahin Yerli,Bediz İliç,Moon Workshop Bilgisayar Yazılım İnş. San. Tic. Ltd. Şti.,Güzeloba Mah. Çağlayangil Cad. Hatice Güleser İş Mrk. No:39/104 Muratpaşa ANTALYA,8508404865
12-A BLŞ,ÇPC,"BİLİŞİM TEKNOLOJİ
Yazılım Geliştirme",5767,Abdullah Beşkaza,Mustafa Zeybekoğlu,İSSE Elektrik Elektronik,Kültür Mah. Hürriyet Cad. No:28/C Kepez ANTALYA,5443468080
12-B GZT,ÇPC,"GAZETECİLİK
Gazetecilik",323,Berrak Karaca,Hatice Zeynep Koyuncu,"Ömer Burak Derin 
Foto Montaj Fotoğrafçılık",Yeşilyurt Mah. 4355 Sok. No:18/A Kepez ANTALYA,5305888297
12-B GZT,ÇPC,"GAZETECİLİK
Gazetecilik",360,Almila Tuana Demircan,Enise Açıkgözoğlu,Arma Digital Fikir Reklam Ajansı,Kızılarık Mah. 2754 Sok. No:1 İç Kapı No:304 Muratpaşa ANTALYA,5435156723
12-B GZT,ÇPC,"GAZETECİLİK
Gazetecilik",2182,Mustafa İlker Özdemir,İsa Ay,Uğur İncik,Kızıltoprak Mah. 900 Sok. No:20A Muratpaşa ANTALYA,5300379261
12-B GZT,ÇPC,"GAZETECİLİK
Gazetecilik",5580,Kardelen Öztürk,Zühal Ejder,Nazik Özge Deniz Üçok,Gençlik Mah. 1330 Sok. Fazilet Apt. No:3/A Muratpaşa ANTALYA,5532047474
12-B GZT,ÇPC,"GAZETECİLİK
Gazetecilik",9972,Roman Fomın,Hatice Zeynep Koyuncu,Fujifilm Dış Tic. A.Ş. Antalya Şubesi,Elmalı Mah. Cumhuriyet Cad. Yıldız Apt. No:52/B Muratpaşa ANTALYA,
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",72,Zeynep Ela Gümüşsoy,Nazmiye Tuncer,Tarık Akın,Kültür mah. 3821 sok. Dilara apt. Daire 11 Kepez ANTALYA,
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",75,Yiğit Demirörs,Hasan Yaşar Coşkun,Metro Grosmarket / Altınova,Altınova Sinan Mah. No:12 Kepez ANTALYA,2423109595
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",312,Gülbeyaz Azboy,Müjğan Ezer,Sıla Beliz Tepe Burgaud,Atatürk Bulvarı Uzaş Cumhuriyet Sitesi B2 Blok No:138/E Konyaaltı ANTALYA,5326731962
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",314,Gülnaz Azboy,Hasan Yaşar Coşkun,Mapa Mobilya Aksesuar Pazarlama A.Ş.,Altınova Sinan Mah. Antalya Cad. No: 14 Kepez ANTALYA,2425055500
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",315,Eda Çelik,Nazmiye Tuncer,Bülent Açıl / Andem Eğitim,Varlık Mah. 100. Yıl Bulvarı Işıldar Apt. No: 59/9 Muratpaşa ANTALYA,5337705862
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",369,Rabia Gelgil,Nuray Abacı Çelikyürek,Migros Ticaret A.Ş.,Arapsuyu Cad. Atatürk Bulvarı No:3/18 Konyaaltı ANTALYA,5347921147
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",401,Elif Güngör,Nazmiye Tuncer,Gülşah Tokmak,Arapsuyu Mah. Atatürk Bulvarı No:11/A Konyaaltı ANTALYA,2422380032
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",608,Dilara Solak,İshak Kalaç,Pelin Cansızer Aydın,Meydankavağı Mah. Avni Tolunay Cad. No:49/3 Muratpaşa ANTALYA,5321304185
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",2264,Sultan Kaya,Nazmiye Tuncer,Yaprak Kuzum Demirörs,Meltem 2. Cad. Falez Sit. Akdeniz Apt. No:14/A Muratpaşa ANTALYA,5050870734
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",3216,Şule Ela Yön,İshak Kalaç,Büşra Begüm Karbay Şar,Fabrikalar Mah. 3055 Sk. Eser İş Merkezi K:3 No:4 D:5 Kepez ANTALYA,5363533456
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",6800,Nisanur Korkut,Hasan Yaşar Coşkun,Asena Yıldırım,Burhanettin Onat Cad. No:59 Ocean Plaza B Blok No:2 Muratpaşa ANTALYA,5057873171
12-C HİL,PSÇ,"HALKLA İLİŞKİLER
Halkla İlişkiler",7398,Tuğçe Yakar,Nuray Abacı Çelikyürek,Okan Deniz,Toros Mah. Atatürk Bulvarı Sevinç Apt. No:50/5 Konyaaltı ANTALYA,5346626503
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",99,Kezban Aytar,Enver Yıldırım,Antalya SMMMO,Soğuksu Mah. Kazım Karabekir Cad. No:17 Muratpaşa ANTALYA,2422386374
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",236,Ceylin Ata,Enver Yıldırım,Sultan Güneş,Yıldız Mah. Mimar Sinan Cad. Çetin 2 Apt. No:37/5 Muratpaşa ANTALYA,5332495957
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",246,Tuana Ata,İbrahim Gökçe,Uğur Urhan,Kültür Mah. 75. Yıl Cad. Veyisoğulları Apt. No:32/3 Kepez ANTALYA,2422273773
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",248,Doğa Ecrin Yay,Enver Yıldırım,Sultan Demir Erdem,Yıldız Mah. 241 Sok. No:3 Yıldız Konutları No:1 Muratpaşa ANTALYA,5462122760
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",280,Bedirhan Boztaş,Fatma Özcan Atakan,Barış Dursun Bekkaya,Teomanpaşa Mah. Gazi Bulvarı Hasan Örs Apt. No:319/2 Kepez ANTALYA,5433669866
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",375,Yağmur Aydoğan,Nejmi Kalender,İbrahim İkiler,Kepez Mah. Suryapı Evleri 3283 Sok. H-6 Blok No:5/38 Kepez ANTALYA,5336159600
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",590,Duru Çelik,Nejmi Kalender,Turgut Kır Otomotiv İnş Em. Tur. Tic. San. Ltd. Şti.,Akdeniz Sanayi Sitesi 5001 Sok. No:96-98-100 Kepez ANTALYA,5548842118
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",862,Hasan Elhammak,Ahmet Sönmez,Hüseyin Akkuş,Kızılsaray Mah. 82. Sok. Egemen İş Merkezi No: 17/103 Muratpaşa ANTALYA,5544262772
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",888,Ela Naz Atay,İbrahim Gökçe,Fatih Bayrak,Kültür Mah. 3824 Sok. No:15/3 Kepez ANTALYA,2422447668
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",903,Eray Gürdal,Vehbi Kılıç,İsmail Demir,Toros Mah. 803 Sok. Salih Fidahgül Apt. No:34/4 Konyaaltı ANTALYA,5332487198
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",1034,Furkan Ekici,Ahmet Sönmez,Ercan Zeyrek,Şafak Mah. 4262 Sok. No:1/4 Kepez ANTALYA,5073106998
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",2209,Eylül Höke,Enver Yıldırım,Necati Şenyiğit,Yıldız Mah. Kazım Karabekir Cad. Emek Apt.No:66/1 Muratpaşa ANTALYA,5326459676
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",2222,Hacer Sueda Özer,Ahmet Sönmez,Ömür Ünal,Kışla Mah. 478 Sok. Yunus Kervan İş Merkezi No:23 Muratpaşa ANTALYA,5452415856
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",2242,Sudenaz Benk,Ahmet Sönmez,Deniz Çalışır,Varlık Mah. Piri Reis Cad. No:27 Kerim Sanlı Apt. Kat 1 Daire 1 Muratpaşa ANTALYA,5327887175
12-D MHS,ÇPC,"MUHASEBE-FİNANS
Muhasebe",5226,Sude Naz Atalay,Ahmet Sönmez,Özlem Bilgiç Yeter,Balbey Mah. 422 Sok. No:2/26 Muratpaşa ANTALYA,5368469747
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",8,Egemen Öner,Selim Genç,Yılmaz Berkay Pınar / Foto Antalya,Güzeloba Mah. Havaalanı Cad. No:36 Muratpaşa ANTALYA,5413111907
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",60,Yağmur Tuana Tosun,Ayşen Sunar,Mehmet Şirin Turan,Şafak Mah. 4254 Sok. No:4/14 Kepez ANTALYA,5435434041
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",67,Mevlüt Çelik,Selim Genç,Mehmet Ali Kaymak / Foto Mali,Kültür Mah. Ulusoy Cad. No:65/C Kepez ANTALYA,5357367967
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",148,Yağmur Erçin,,Kadir Erden / Rooftop Antalya,Tuzcular Mah. İmaret Sok. Kırımoğlu İş Hanı No:7 Muratpaşa ANTALYA,5066959129
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",328,Taylan Ayaz,Ayşen Sunar,Mehmet Demir / Moneta Films,"Çatalköprü Cad., No:18, Tahılpazarı Mah., Muratpaşa, Antalya",5418981502
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",356,Aysu Berra Esener,Şerife Dilek Eşki,Merve Çardak,Karşıyaka Mah. 3940 Sok. Yavuz İş Merkezi No:71/2 Kepez ANTALYA,5062100790
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",2285,Tuana Ceylan,Ali Kozan,Akın Kaan Demirbaş,Şafak Mah. 4250 Sok. No:40/A Kepez ANTALYA,5453630181
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",2288,Sudenaz Urkancı,Şerife Dilek Eşki,Hüseyin Doğan,Şafak Mah. Ş. Binbaşı E. Özdemir Cad. Kübra Apt. No:28/A Kepez ANTALYA,5426539206
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",2341,Melek Aleyna Altaş,Ali Kozan,Soniks Radyo Televizyon Reklamcılık A.Ş.,Tahılpazarı Mah. 470 Sok. K. Erkal İş Merkezi No: 4/204 Muratpaşa ANTALYA,5326624825
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",4466,Hazal Tuana Eridi,Ayşen Sunar,Ufuk Saraçoğlu Fotoğrafçılık,Varlık Mah. 100. Yıl Bulv. No:60/4 Muratpaşa ANTALYA,5514095354
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",5572,Hanife Eral,Ali Kozan,Akdeniz Radyo Televizyon ve Tanıtım Hizmetleri A.Ş.,Tahılpazarı Mah. 470 Sok. K. Erkal İş Merkezi No: 4/204 Muratpaşa ANTALYA,5322118055
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",5622,Şevval Yılmaz,Selim Genç,Mehmet Mahsum Akyel,Şafak Mah. Azem Akkaya Cad. No:35/A Kepez ANTALYA,5418484707
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",5915,Ahmet Mustafa Çelik,Ali Kozan,Akdeniz Radyo Televizyon ve Tanıtım Hizmetleri A.Ş.,Tahılpazarı Mah. 470 Sok. K. Erkal İş Merkezi No: 4/204 Muratpaşa ANTALYA,5322118055
12-F RTV,PSÇ,"RADYO TV
Radyo Televizyon",7503,Beyza Özcan,Şerife Dilek Eşki,Osman Kızık / Stüdyo Kral,Ulus Mah. Mehmet Akif Cad. Günar Apt. No:56/B Kepez ANTALYA,5375077535
12-G PLS,ÇPC,"PLASTİK SANATLAR
Plastik Sanatlar",81,Defne Sena Barkın,Yeter Tütüncü,Kun Yapı Malzemeleri Test Lab.,Gençlik Mah. Işıklar Cad. Onur Apt. 45/5 Muratpaşa ANTALYA,5325960627
12-G PLS,ÇPC,"PLASTİK SANATLAR
Plastik Sanatlar",86,Melek Su Eraslan,Yeter Tütüncü,Kun Yapı Malzemeleri Test Lab.,Gençlik Mah. Işıklar Cad. Onur Apt. 45/5 Muratpaşa ANTALYA,5325960627
12-G PLS,ÇPC,"PLASTİK SANATLAR
Plastik Sanatlar",333,Tuana Tıkır,Müjğan Ezer,Poloant Dijital Baskı Teknolojileri,Emek Mah. Sakarya Bulv. No:320 Kepez ANTALYA,5338902269
12-G PLS,ÇPC,"PLASTİK SANATLAR
Plastik Sanatlar",364,Feyza Akdaş,Yeter Tütüncü,"Yakup Kutupoğlu
Özel Siyah Kalem Resim Kursu",Kışla Mah. 53. Sok. Ardıç Apt. No:6/13A Muratpaşa ANTALYA,5548763162
12-G PLS,ÇPC,"PLASTİK SANATLAR
Plastik Sanatlar",733,Berra Akdaş,Müjğan Ezer,Sıla Beliz Tepe Burgaud,Atatürk Bulvarı Uzaş Cumhuriyet Sitesi B2 Blok No:138/E Konyaaltı ANTALYA,5326731962
12-G PLS,ÇPC,"PLASTİK SANATLAR
Plastik Sanatlar",770,Cansu Bulut,Seda Yıldırım,Mine İpek / Vitray Tasarım,Fener Mah. 1942 Sok. No:2/2 Muratpaşa ANTALYA,5359657117
12-G PLS,ÇPC,"PLASTİK SANATLAR
Plastik Sanatlar",869,Gizem Ilgın,Müjğan Ezer,Sıla Beliz Tepe Burgaud,Atatürk Bulvarı Uzaş Cumhuriyet Sitesi B2 Blok No:138/E Konyaaltı ANTALYA,5326731962
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",10,Eymen Bedir Uslu,Bekir Arık,Döşemealtı Belediye Başkanlığı,Yeniköy Atatürk Cad. No:521 Döşemealtı ANTALYA,4440507
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",29,Sude Kalır,Mustafa Zeybekoğlu,Kreatif Baskı Çözümleri San. Tic. Ltd. Şti.,Bülent Ecevit Bul. Çağlayan Mah. Mavi Yıldız Ateş Sit. No:114/B Muratpaşa ANTALYA,5011537070
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",265,Ayşenaz Şenlik,Bediz İliç,Antalya Bölge Adliye Mahkemesi Cumhuriyet Başsavcılığı,"Meltem, Dumlupınar Blv. No:173, 07030 Muratpaşa ANTALYA",2422457200
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",319,İlayda Topal,Bediz İliç,Antalya Bölge Adliye Mahkemesi Cumhuriyet Başsavcılığı,"Meltem, Dumlupınar Blv. No:173, 07030 Muratpaşa ANTALYA",2422457200
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",345,Efe Kavas,Bekir Arık,ABM Furkan Elektronik,Zerdalilik Mah. 1408 Sok. Güngör Apt. No:6/3 Muratpaşa ANTALYA,2423441071
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",357,Miraç Efe Özçağlıyan,Yusuf Kurt,Başaran Otomotiv Otelcilik Turizm İnş. San. Tic. AŞ.,Altınova Sinan Mah. Serik Cad. No:161 Kepez ANTALYA,2423108700
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",365,İlayda Kır,Engin Dalga,Meltem Ozalit Kırtasiye San. Tic. Ltd. Şti.,Meltem Mah. Meltem Bulv. Çağrı 4 Sit. No:13/BA Muratpaşa ANTALYA,5302203077
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",860,Mete Durak,Bediz İliç,Antalya Bölge Adliye Mahkemesi Cumhuriyet Başsavcılığı,"Meltem, Dumlupınar Blv. No:173, 07030 Muratpaşa ANTALYA",2422457200
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",1988,Yağız Kıldacı,Mustafa Zeybekoğlu,İSSE Elektrik Elektronik,Kültür Mah. Hürriyet Cad. No:28/C Kepez ANTALYA,5443468080
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",2064,Tunahan Karakoç,Mustafa Zeybekoğlu,Muratpaşa Belediye Başkanlığı,Fener Tekelioğlu Cad. No:63 Muratpaşa ANTALYA,4448007
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",2414,Kuzey Ateş Karasay,Engin Dalga,Anexservis Turizm Org. Taş. Tic. A.Ş.,Barbaros Mah. Serik Cad. A Blok No:419A/1 Aksu ANTALYA,2423242930
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",6025,Zümra Nur Sönmez,Bekir Arık,Seçil Bayrak San. Tic. Ltd. Şti.,AOSB I. Kısım Antalya Bulvarı No:20 Döşemealtı ANTALYA,2422446998
12-H BLŞ,PSÇ,"BİLİŞİM TEKNOLOJİ
Ağ İşl.ve Siber Güv.",6936,Yağız Efe Erişdi,Engin Dalga,Vatan Bilgisayar Tic. A.Ş.,Mevlana Cad. No: 54 Muratapaşa ANTALYA,2425024062
12-M MHS,PSÇ,"MUHASEBE-FİNANS
Dış Ticaret",7,Reyyanur Yapıcı,Enver Yıldırım,Çiğdem Karakaş,Meltem Mah. Tarık Akıltopu Cad. Özlem Sit. A/14 Blok No:76/2 Muratpaşa ANTALYA,2422370424
12-M MHS,PSÇ,"MUHASEBE-FİNANS
Dış Ticaret",100,Kardelen Kaya,Enver Yıldırım,Müşerref Uysal,Yıldız Mah. Kazım Karabekir Cad. Yılmaz Apt. No:88/1 Muratpaşa ANTALYA,5309731011
12-M MHS,PSÇ,"MUHASEBE-FİNANS
Dış Ticaret",140,Umut Devran Kurnaz,Nilgün Uluyüksel,Mehmet Demir,Muratpaşa Mah. 575 Sok. Şimşek Apt. No:3/5 Muratpaşa ANTALYA,2422470210
12-M MHS,PSÇ,"MUHASEBE-FİNANS
Dış Ticaret",284,Batuhan Davaslı,Nilgün Uluyüksel,Hasan Çeltikçi,Kültür Mah. Hürriyet Cad. Abdi Çavuş 1/D No:34/4 Kepez ANTALYA,5337053057
12-M MHS,PSÇ,"MUHASEBE-FİNANS
Dış Ticaret",309,Kerem Deniz,Ahmet Sönmez,Veysel Fırat Balcı,Tahıl Pazarı Mah. İsmetpaşa Cad. Kökmen İşHanı Kat : 3 No:35 Muratpaşa ANTALYA,5062424595
12-M MHS,PSÇ,"MUHASEBE-FİNANS
Dış Ticaret",7421,İrem Denlü,Fatma Özcan Atakan,Sinan Alkın,Sedir Mah. Gazi Bulvarı No:92/2 Muratpaşa ANTALYA,5554689185
12-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202421,Ayşegül KARADUMAN,İbrahim Gökçe,Ramazan Obalar ,"Kültür Mah. Ulusoy Cad. No: 109/3
Kepez ANTALYA",2425020209
12-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202422,Efsanaz YAVAŞLAR,İbrahim Gökçe,Melahat Ünlü,Öğretmenevleri Mah. 999. Sok. Diker Apt. 34/3 Konyaaltı ANTALYA,5334421661
12-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202423,Elif POYRAZ,Fatma Özcan Atakan,A.Ç.S. Özel Sağlık Hizmetleri A.Ş.,Kanal Mah. Halide Edip Cad. Vitale Hastanesi Sit. No:5 Kepez ANTALYA,2423452828
12-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202438,Fatma Naz ARABACI,Fatma Özcan Atakan,Hüseyin Tutar,Konuksever Mah. Gazi Bulvarı No:258/3 Muratpaşa ANTALYA,5303104155
12-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202444,Sümeyye Nur BAYRAM,Nilgün Uluyüksel,Bayram Gökçe,Muratpaşa Mah. 561. Sok. No:1/305 Muratpaşa ANTALYA,2422425151
12-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202443,Yağmur COŞAR,Fatma Özcan Atakan,Mustafa Yarbaş,Teomanpaşa Mah. Yeşilırmak Cad. 2269 Sok. Yarbaş Apt. No:8/1 Kepez ANTALYA,5442393529
12-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202441,Zahide KARAGÖZ,Fatma Özcan Atakan,Recep Koç,Karşıyaka Mah. Sakarya Bulv. No:266/6 Kepez ANTALYA,5467989494
12-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202432,Zehra YÖRÜK,Alper Akdemir,STM Alüminyum,"Şafak Mah. Akdeniz Sanayi Sitesi 5037 Sok.
Kepez ANTALYA",5464904296
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202427,Mehmet Enes BALCI,Ahmet Sönmez,Veysel Fırat Balcı,Tahıl Pazarı Mah. İsmetpaşa Cad. Kökmen İşHanı Kat : 3 No:35 Muratpaşa ANTALYA,5062424595
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202434,Hicran KAHRAMAN,Ahmet Sönmez,Savaş Başgör,Kışla Mah. 44. Sok. Büyükeroğan İş Merkezi No:3/103 Muratpaşa ANTALYA,2422429928
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202437,Aleyna KIRCA,Nilgün Uluyüksel,Mustafa Kara,Memurevleri Mah. Derya Cad. Anafartalar İş Merkezi No:1 Muratpaşa ANTALYA,5357657882
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202445,Gülnihal TÜRKAN,Nejmi Kalender,Özgür Gencer,Yıldız Mah. Yıldız Cad. Kösem Apt. No:59/4 Muratpaşa ANTALYA,5445540440
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202454,İsmail ÖZTÜRK,Nejmi Kalender,Ömer Faruk Yıldız,Memurevleri Mah. Güllük Cad. Birlik Apt. No:125/10 Muratpaşa ANTALYA,5336226393
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202453,Medine GÜNEŞ,Nejmi Kalender,Mehmet Kaplangiray,Altındağ Mah. Güllük Cad. Ongun Apt. No:103 Muratpaşa ANTALYA,5335225586
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202442,Nisanur BİYİKLİ,Vehbi Kılıç,Adem Yalçın,Kışla Mah. Şehit Binbaşı Cengiz Toytunç Cad. No:103/Z01 Muratpaşa ANTALYA,5427921463
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202524,Nisanur KAPLAN,Nejmi Kalender,Mehmet Karagöz,Santral Mah. 3283 Sok. No:13 B/5 Kepez ANTALYA,5542607763
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202506,Nuray DOĞANCI,Vehbi Kılıç,Halil Tat,Cumhuriyet Mah. 653 Sok. No:1/8 Muratpaşa ANTALYA,5305664993
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202450,Ozan ALIPTETRİN,Fatma Özcan Atakan,Halil Haldan,Ulus Mah. 2115 Sok. Yılmaz Apt. No:53/B Kepez ANTALYA,5054803751
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202451,Yalçın Yiğit YARBAŞ,Fatma Özcan Atakan,Mustafa Yarbaş,Teomanpaşa Mah. Yeşilırmak Cad. 2269 Sok. Yarbaş Apt. No:8/1 Kepez ANTALYA,5442393529
11-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202521,Yüsra KARBUZ,Vehbi Kılıç,Adem Yalçın,Kışla Mah. Şehit Binbaşı Cengiz Toytunç Cad. No:103/Z01 Muratpaşa ANTALYA,5427921463
11-MeSeM,PSPC,"BİLİŞİM TEKNOLOJİ
Bilg. Tek. Ser.",202446,Alperen Mert AKBAŞ,Yusuf Kurt,Antalya Elektronik Mühendislik,Ünsal Mah. 5108 Sok. No:1/H Kepez ANTALYA,2429992580
11-MeSeM,PSPC,"BİLİŞİM TEKNOLOJİ
Bilg. Tek. Ser.",202512,Kenan USTAZ,Bekir Arık,Bayram Bodrumlu,Siteler Mah. 1318 Sok. No:8/A Konyaaltı ANTALYA,5337613300
11-MeSeM,PSPC,"BİLİŞİM TEKNOLOJİ
Bilg. Tek. Ser.",202448,Mehmet Berat TOKSÖZ,Bekir Arık,Bayram Bodrumlu,Siteler Mah. 1318 Sok. No:8/A Konyaaltı ANTALYA,5337613300
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202447,Bartu ÇOBAN,Nejmi Kalender,Süleyman Yakalı,Fabrikalar Mah. 3001 Sok. No 27/1 Kepez ANTALYA,5432542438
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202508,Ebrar KABAN,İbrahim Gökçe,Aslı Kazıcı,Kültür Mah. 3805 Sok. Uğurlu Apt. No:33/1 Kepez ANTALYA,5054415622
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202515,Hatice FİKİRLİ,Nilgün Uluyüksel,Şevki Mavi,Muratpaşa Mah. 572 Sok. No:10/2 Muratpaşa ANTALYA,5338131050
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202505,Melike Buse İNCE,Vehbi Kılıç,Hülya Erbulut,Üçgen Mah. 96. Sok. No:3511 Daire 28 Muratpaşa ANTALYA,5388894874
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202504,Şükrü TEZCAN,İbrahim Gökçe,Başoğlu Balıkçılık Su Ürünleri Ltd. Şti.,Altınkum Mah. Atatürk Bulvarı No:126/A Konyaaltı ANTALYA,2422372328
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202503,Melike MİLLİ,Enver Yıldırım,Sultan Demir Erdem,Yıldız Mah. 241 Sok. No:3 Yıldız Konutları No:1 Muratpaşa ANTALYA,5462122760
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202511,Mert GÖÇ,Vehbi Kılıç,Erman Ernez,Kışla Mah. Milli Egemenlik Cad. Ertuğrul Bey Apt. No: 8/4 Muratpaşa ANTALYA,5306419690
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202507,Nehir İŞCAN,Nilgün Uluyüksel,Mustafa Kara,Memurevleri Mah. Derya Cad. Anafartalar İş Merkezi No:1 Muratpaşa ANTALYA,5357657882
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202519,Recep Miraç SEVİNÇ,Vehbi Kılıç,Ulviye Sevinç,Üçgen Mah. Sokullu Cad. Ülkü Apt. No:8/8 Muratpaşa ANTALYA,5066867686
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202520,Sudenaz AŞKAN,Nejmi Kalender,Özgür Gencer,Yıldız Mah. Yıldız Cad. Kösem Apt. No:59/4 Muratpaşa ANTALYA,5445540440
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202502,Tuğba KOYUNCU,Vehbi Kılıç,Ali Ulusoy,Balbey Mah. Fahrettin Altay Cad. Hamdi Cesur İş Merkezi No:101 Muratpaşa ANTALYA,5423478121
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202501,Yağmur İBEK,Nilgün Uluyüksel,Hüseyin Kaya,Üçgen Mah. Şarampol Cad. Alembeğendi Apt. No:153/6 Muratpaşa ANTALYA,2422438587
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202513,Yiğit Umut ASLAN,Erkan Canan,Günkum Turizm / Porto Bello Hotel,Liman Mah. 1. Sok. No:4A/4B Konyaaltı ANTALYA,5051900156
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202523,Yusuf Emir BALCI,Ahmet Sönmez,Veysel Fırat Balcı,Tahıl Pazarı Mah. İsmetpaşa Cad. Kökmen İşHanı Kat : 3 No:35 Muratpaşa ANTALYA,5062424595
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202509,Zehra KESKİN,İbrahim Gökçe,Mustafa Serttürk,Kültür Mah. 3837 Sok. Abdi Çavuş 1 Sitesi A Blok No:7 Kepez ANTALYA,5300736698
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202516,Zeynep URHAN,Nejmi Kalender,Uğur Urhan,Kültür Mah. 75. Yıl Cad. Veyisoğulları Apt. No:32/3 Kepez ANTALYA,2422273773
09-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202601,Muharrem Buğra ERBAŞ,İbrahim Gökçe,Tevfik Fikret Küçükerciyes,Arapsuyu Mah. Atatürk Bulvarı 29/2 Konyaaltı ANTALYA,5379446206
10-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202602,İslim Nisa Tamer,İbrahim Gökçe,Melahat Ünlü,Öğretmenevleri Mah. 999. Sok. Diker Apt. 34/3 Konyaaltı ANTALYA,5334421661
09-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202603,Osman Denlü,Fatma Özcan Atakan,Halil Haldan,Ulus Mah. 2115 Sok. Yılmaz Apt. No:53/B Kepez ANTALYA,5054803751
09-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202604,Fatma Nur Kunduz,Nilgün Uluyüksel,Hanife Aydemir-Serkan Dal Adi Ortaklığı,Varlık Mah. 100. Yıl Bulvarı Sönmez Apt. No:115/13 Muratpaşa ANTALYA,2422383855
09-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202605,Şehmus İsa Kardaş,Fatma Özcan Atakan,Barış Dursun Bekkaya,Teomanpaşa Mah. Gazi Bulvarı Hasan Örs Apt. No:319/2 Kepez ANTALYA,5433669866
09-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202606,Süleyman Enes Korkut,İbrahim Gökçe,Ramazan Obalar ,"Kültür Mah. Ulusoy Cad. No: 109/3
Kepez ANTALYA",2425020209
09-MeSeM,PSPC,"MUHASEBE-FİNANS
Muhasebe",202607,Şemsettin Muhammed Özben,Vehbi Kılıç,Fatih Özbay,Elmalı Mah. Hasan Subaşı Cad. No:13/5 Muratpaşa ANTALYA,5058277686`;

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(cell.trim());
      cell = '';
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (cell.trim() || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c !== '')) rows.push(row);
  }
  return rows;
}

const parsedRows = parseCSV(rawCSV);
console.log('Parsed valid student rows:', parsedRows.length);

const sheetData = [
  ['HÜSNİYE ÖZDİLEK TİCARET MESLEKİ ve TEKNİK ANADOLU LİSESİ'],
  ['2026-2027 EĞİTİM ÖĞRETİM YILI'],
  ['KOORDİNATÖR ÖĞRETMEN GÖREVLENDİRMESİ'],
  ['', '', '', '', '', '', '', '', '2026-09-14'],
  [],
  ['Sınıf', 'Staj \r\nGünü', 'Bölüm', 'No', 'Adı Soyadı', 'Koordinatör\r\nÖğretmen', 'Öğrencinin Çalıştığı'],
  ['', '', '', '', '', '', 'İşletmenin Adı', 'İşletmenin Adresi', 'Telefonu']
];

for (const r of parsedRows) {
  const no = isNaN(Number(r[3])) ? r[3] : Number(r[3]);
  const tel = isNaN(Number(r[8])) ? r[8] : Number(r[8]);
  
  sheetData.push([
    r[0], // Sınıf
    r[1], // Staj Günü
    r[2], // Bölüm
    no,   // No
    r[4], // Adı Soyadı
    r[5], // Koordinatör Öğretmen
    r[6], // İşletmenin Adı
    r[7], // İşletmenin Adresi
    tel   // Telefonu
  ]);
}

// Add footer
sheetData.push([]);
sheetData.push([]);
sheetData.push(['', '2026-2027 Eğitim Öğretim Yılında koordinatörlük görevleriniz yukarıda belirtildiği gibidir. Görevinizi hassasiyetle yerine getirmenizi temenni eder, kolaylıklar dilerim.']);
sheetData.push([]);
sheetData.push(['', '', '', '', '', '', '', '2026-09-14']);
sheetData.push([]);
sheetData.push([]);
sheetData.push(['', '', '', '', '', '', '', 'ERKAN CANAN']);
sheetData.push(['', '', '', '', '', '', '', 'Okul Müdürü']);

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(sheetData);
XLSX.utils.book_append_sheet(wb, ws, 'tüm');

const targetPath = path.join(__dirname, '..', '02. Koordinatör Öğretmen Görevlendirmesi - 14 09 2026.xlsx');
XLSX.writeFile(wb, targetPath);

console.log('Successfully written Excel file to:', targetPath);
