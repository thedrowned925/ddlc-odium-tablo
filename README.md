# DDLC Türkçe Dublaj — İlerleme Takibi

Odium Studios için DDLC Türkçe Dublaj projesinin kayıt/mix/eksik durumlarını görselleştiren responsive statik takip sayfası.

## Veri modeli

`data.js`, proje tablosundaki script satırlarından üretilir. Üst özet metnindeki eksik replik toplamları karakter bazında kaynak kabul edilir; script satırlarındaki replik sayıları yaklaşık olduğundan sayfada bu durum belirtilir.

## Yerel çalıştırma

Statik dosyalar olduğu için herhangi bir basit HTTP sunucusu yeterlidir:

```bash
python -m http.server 8000
```

Ardından `http://localhost:8000` adresini açın.
