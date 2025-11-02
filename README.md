# LLM Tokenizer Benchmark

A client-side web application designed to benchmark the token usage, response time, and cost of various Large Language Models (LLMs) across different languages. This tool is particularly useful for analyzing the performance differences between English, Turkish, and Turkish with diacritics removed (`tr_nodia`). All processing and API key storage happens entirely within your browser for maximum privacy.

---

### Features

-   **Client-Side Processing:** No data or API keys are ever sent to a server. Everything happens in your browser.
-   **Multiple Providers:** Benchmark models from OpenAI, Google Gemini, xAI Grok, and more.
-   **Multi-Language Analysis:** Specifically designed to compare `en`, `tr`, and `tr_nodia` performance.
-   **Detailed Metrics:** Get insights on prompt tokens, response time, and cost.
-   **Visualizations & Analysis:** Interactive charts and a summary dashboard to easily compare results.
-   **Data Export:** Export raw results to CSV or JSONL for further analysis.
-   **Concurrency Control:** Adjust parallel requests and delays to respect API rate limits.

---

## How to Use

1.  **Prepare Your Dataset:**
    -   Create a `CSV` or `JSONL` file with parallel text data.
    -   It **must** contain columns for a unique identifier, English text, and Turkish text.
    -   An optional column for Turkish without diacritics (`tr_nodia`) can be included; otherwise, it will be generated automatically on the client-side.
    -   Example column names: `id`, `en`, `tr`, `tr_nodia`.

2.  **Upload File:**
    -   Drag and drop your dataset file onto the upload area or click to select it from your computer.

3.  **Map Columns:**
    -   In the modal that appears, map the required columns (`id`, `en`, `tr`) to the corresponding columns from your file. The tool will try to auto-detect them.

4.  **Configure Providers & Settings:**
    -   In the **Provider Settings** section, enable the LLM providers you want to test.
    -   Enter your API keys for each enabled provider. You can choose to have your API keys remembered securely in your browser's `localStorage` by checking "Remember key".
    -   Add or remove the specific models you want to include in the benchmark.
    -   In the **Run Benchmark** section, adjust concurrency and delay settings to manage the rate of API calls. You can also choose to run the benchmark on a subset of your data by specifying the number of rows.

5.  **Run Benchmark:**
    -   Click the "Run Benchmark" button. A progress bar will show the status of the API calls. You can cancel the run at any time.

6.  **Analyze Results:**
    -   Once the run is complete, the results will be displayed:
        -   **Performance Analysis:** A summary of percentage differences in token usage, time, and cost between language variants.
        -   **Raw Data:** A detailed table of every API call and its result.
        -   **Visualizations:** Interactive charts comparing mean tokens, token ratios, and response times.

---
## Privacy Note

Your API keys are handled securely. They are stored only in your browser's memory during the session. If you check the "Remember key" option, the key is stored in your browser's `localStorage` and is never transmitted to any server. All data processing occurs locally.

<br>

---

# LLM Tokenizer Karşılaştırma Aracı

Farklı dillerdeki Büyük Dil Modellerinin (LLM'ler) token kullanımını, yanıt süresini ve maliyetini karşılaştırmak için tasarlanmış, istemci tarafında çalışan bir web uygulamasıdır. Bu araç, özellikle İngilizce, Türkçe ve diyakritik işaretleri kaldırılmış Türkçe (`tr_nodia`) arasındaki performans farklarını analiz etmek için kullanışlıdır. Maksimum gizlilik için tüm işlemler ve API anahtarı depolama işlemleri tamamen tarayıcınızda gerçekleşir.

---

### Özellikler

-   **İstemci Taraflı İşlem:** Hiçbir veri veya API anahtarı bir sunucuya gönderilmez. Her şey tarayıcınızda gerçekleşir.
-   **Çoklu Sağlayıcı Desteği:** OpenAI, Google Gemini, xAI Grok ve daha fazlasından modelleri karşılaştırın.
-   **Çok Dilli Analiz:** `en`, `tr` ve `tr_nodia` performansını karşılaştırmak için özel olarak tasarlanmıştır.
-   **Detaylı Metrikler:** Prompt tokenları, yanıt süresi ve maliyet hakkında derinlemesine bilgi edinin.
-   **Görselleştirmeler ve Analiz:** Sonuçları kolayca karşılaştırmak için interaktif grafikler ve bir özet panosu.
-   **Veri Dışa Aktarma:** Ham sonuçları daha fazla analiz için CSV veya JSONL formatında dışa aktarın.
-   **Eşzamanlılık Kontrolü:** API hız limitlerine uymak için paralel istekleri ve gecikmeleri ayarlayın.

---

## Kullanım Kılavuzu

1.  **Veri Setinizi Hazırlayın:**
    -   Paralel metin verileri içeren bir `CSV` veya `JSONL` dosyası oluşturun.
    -   Dosya, benzersiz bir kimlik, İngilizce metin ve Türkçe metin için sütunlar içermelidir.
    -   Diyakritiksiz Türkçe (`tr_nodia`) için isteğe bağlı bir sütun eklenebilir; aksi takdirde istemci tarafında otomatik olarak oluşturulacaktır.
    -   Örnek sütun adları: `id`, `en`, `tr`, `tr_nodia`.

2.  **Dosyayı Yükleyin:**
    -   Veri setinizi yükleme alanına sürükleyip bırakın veya bilgisayarınızdan seçmek için tıklayın.

3.  **Sütunları Eşleştirin:**
    -   Görünen pencerede, gerekli sütunları (`id`, `en`, `tr`) dosyanızdaki karşılık gelen sütunlarla eşleştirin. Araç, sütunları otomatik olarak algılamaya çalışacaktır.

4.  **Sağlayıcıları ve Ayarları Yapılandırın:**
    -   **Provider Settings** bölümünde, test etmek istediğiniz LLM sağlayıcılarını etkinleştirin.
    -   Etkinleştirdiğiniz her sağlayıcı için API anahtarlarınızı girin. "Remember key" seçeneğini işaretleyerek API anahtarlarınızın tarayıcınızın `localStorage`'ında güvenli bir şekilde hatırlanmasını sağlayabilirsiniz.
    -   Karşılaştırmaya dahil etmek istediğiniz belirli modelleri ekleyin veya kaldırın.
    -   **Run Benchmark** bölümünde, API çağrı oranını yönetmek için eşzamanlılık ve gecikme ayarlarını yapın. Ayrıca, satır sayısını belirterek karşılaştırmayı verilerinizin bir alt kümesinde çalıştırmayı da seçebilirsiniz.

5.  **Karşılaştırmayı Başlatın:**
    -   "Run Benchmark" düğmesine tıklayın. Bir ilerleme çubuğu, API çağrılarının durumunu gösterecektir. Çalıştırmayı istediğiniz zaman iptal edebilirsiniz.

6.  **Sonuçları Analiz Edin:**
    -   Çalışma tamamlandığında, sonuçlar görüntülenecektir:
        -   **Performans Analizi:** Dil varyantları arasındaki token kullanımı, süre ve maliyetteki yüzdesel farkların bir özeti.
        -   **Ham Veri:** Her API çağrısının ve sonucunun ayrıntılı bir tablosu.
        -   **Görselleştirmeler:** Ortalama tokenları, token oranlarını ve yanıt sürelerini karşılaştıran interaktif grafikler.

---
## Gizlilik Notu

API anahtarlarınız güvenli bir şekilde işlenir. Yalnızca oturum sırasında tarayıcınızın belleğinde saklanırlar. "Remember key" seçeneğini işaretlerseniz, anahtar tarayıcınızın `localStorage`'ında saklanır ve hiçbir sunucuya iletilmez. Tüm veri işleme işlemleri yerel olarak gerçekleşir.
