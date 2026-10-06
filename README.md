# Homie — Kế hoạch hoàn thành MVP TrueHome cho nhóm 4 người

Web tìm trọ bằng thuật toán thay vì thủ công và liên lạc. Repository mang tên Homie; bộ đặc tả dùng tên dự án TrueHome theo nội dung đã thống nhất.

Repository hiện có **trang mẫu tìm phòng trên bản đồ** và bộ đặc tả/checklist để triển khai MVP đầy đủ. Các ô `[ ]` là việc chưa nghiệm thu; chỉ đánh dấu `[x]` khi có bằng chứng chạy được. Ngày lập: 06/10/2026.

## Chạy trang map mẫu

Cần Node.js 20.9+ và npm. Chạy từ thư mục gốc:

```sh
npm ci
npm run dev
```

Mở [http://127.0.0.1:3000](http://127.0.0.1:3000). Trang có 18 phòng hư cấu tại TP.HCM, marker giá, lọc khu vực/giá/diện tích/tiện ích, tìm đường không dấu, chọn phòng qua card/marker và giao diện mobile. Bản đồ nền là dữ liệu OpenStreetMap; vị trí và thông tin phòng chỉ để minh họa, ảnh không phải ảnh phòng thực tế.

Nhấn **Thử đồng bộ**, thay giá/trạng thái rồi lưu; quan sát list và map ở hai tab. Danh sách và map cùng sử dụng một snapshot API. Xem [MAP_SYNC.md](MAP_SYNC.md) để hiểu cách truy vấn vùng bản đồ, chống response cũ và cập nhật giữa các tab.

Dữ liệu phòng mẫu nằm trong bộ nhớ của một tiến trình server, mất khi restart; chưa có database, auth, đặt phòng hoặc thanh toán thật. API chỉnh mẫu mặc định chỉ bật trong development; production phải chủ động bật `HOMIE_ENABLE_DEMO_MUTATIONS=true` nếu là môi trường demo riêng. Không bật endpoint demo trên hệ thống dữ liệu thật. Nền map cần Internet; URL tile có thể cấu hình trong [apps/web/.env.example](apps/web/.env.example).

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm start` chạy bản production sau build; mặc định xem/lọc được nhưng không thay dữ liệu mẫu. Hướng dẫn và checklist MVP bên dưới là mục tiêu toàn hệ thống, không có nghĩa đã triển khai hết.

## 1. Mục tiêu và phạm vi

Xây dựng web responsive giúp người thuê tìm phòng, liên hệ, đặt lịch, đặt cọc thử nghiệm và chuyển nhượng; chủ trọ và môi giới cùng sử dụng thông tin, giá và trạng thái của một phòng thực tế.

MVP phải chạy xuyên suốt: **tạo phòng → xác minh → tìm trên bản đồ/chatbot → liên hệ → xem phòng → giữ chỗ → cọc thử nghiệm → hợp đồng/cư trú → đánh giá hoặc chuyển nhượng**.

### Tính năng bắt buộc

- [ ] Tài khoản, đăng nhập và phân quyền TENANT / OWNER / AGENT / ADMIN; một người có thể có nhiều vai trò.
- [ ] Chủ quản lý tòa nhà/phòng; môi giới chỉ truy cập phòng được cấp quyền.
- [ ] Mỗi phòng thực tế có mã duy nhất; tách tòa nhà, phòng và lần đăng tin.
- [ ] Quản trị xác minh, duyệt tin, phát hiện nghi trùng và xử lý báo cáo.
- [ ] Tìm bằng bộ lọc, vùng bản đồ và bán kính; danh sách và marker thống nhất.
- [ ] Chi tiết phòng, yêu thích và so sánh tối đa 3 phòng.
- [ ] Chatbot chuyển nhu cầu thành bộ lọc và giải thích phòng có thật; thiếu thông tin thì hỏi lại.
- [ ] Chat trực tiếp; chọn chủ/môi giới được phép liên hệ, chưa cần tự động điều phối như Grab.
- [ ] Đặt/xác nhận/hủy lịch xem; lưu lịch sử xem và kết quả.
- [ ] Giữ chỗ có thời hạn, cọc qua sandbox, cập nhật trạng thái và chống giữ chỗ trùng.
- [ ] Hợp đồng cơ bản, tệp hợp đồng, cư trú và thời hạn thuê; chưa cần ký điện tử.
- [ ] Người đã từng cư trú được đánh giá; công khai ẩn danh nhưng lưu tác giả nội bộ.
- [ ] Chuyển nhượng: yêu cầu → chủ duyệt → tin công khai → ứng tuyển → chọn người → bàn giao.
- [ ] Thông báo trong ứng dụng, lịch sử thay đổi và cập nhật phòng giữa các phiên.
- [ ] Triển khai môi trường demo, dữ liệu mẫu, kiểm thử các luồng chính và hướng dẫn chạy.

### Giới hạn phiên bản đầu

- Một thành phố thí điểm, một múi giờ hiển thị Asia/Ho_Chi_Minh, tiền VND.
- Một nhà cung cấp bản đồ và một kênh thanh toán sandbox. Nếu chưa có sandbox, simulator chỉ được dùng cho kiểm thử nội bộ và phải ghi rõ khi demo.
- Thanh toán thật chỉ mở sau khi có cấu hình nhà cung cấp, quy trình hoàn tiền/đối soát và kiểm thử vận hành; chưa nằm trong tiêu chí nghiệm thu của bộ này.
- Chatbot xử lý giá, vị trí, diện tích, tiện ích và ngày vào ở. Thời gian di chuyển chỉ hiển thị khi có dịch vụ định tuyến; không suy ra phút đi đường từ khoảng cách thẳng.
- Kiểm duyệt phòng thủ công, cảnh báo trùng theo dữ liệu cơ bản; chưa cần nhận diện ảnh bằng AI.
- Không có ví nội bộ, escrow, tối ưu hành trình nhiều điểm, ứng dụng native hay quản lý hóa đơn định kỳ đầy đủ.

## 2. Phân công và ranh giới

| Người | File nhiệm vụ | Sở hữu chính |
|---|---|---|
| P1 | [01_GIAO_DIEN.md](01_GIAO_DIEN.md) | Thiết kế, component, layout và trạng thái hiển thị |
| P2 | [02_LOGIC_GIAO_DIEN.md](02_LOGIC_GIAO_DIEN.md) | Điều hướng, form, gọi API, cache và realtime phía trình duyệt |
| P3 | [03_BACKEND_MAP_TIM_KIEM.md](03_BACKEND_MAP_TIM_KIEM.md) | API nghiệp vụ, tìm kiếm/map, lịch xem, giao dịch và đồng bộ |
| P4 | [04_DATABASE_HA_TANG.md](04_DATABASE_HA_TANG.md) | Schema, repository/query, auth, lưu trữ, worker và hạ tầng |

P1 cung cấp component nhận props/callback; P2 nối hành vi và dữ liệu. P3 quy định nghiệp vụ; P4 triển khai truy vấn và transaction dùng bởi P3. P4 làm auth service; P3 áp dụng quyền theo từng tài nguyên. P3 tạo sự kiện nghiệp vụ; P4 vận hành outbox/worker; P2 nhận sự kiện; P1 thiết kế cách hiển thị.

Từng người viết kiểm thử phù hợp cho phần mình. P2 điều phối kiểm thử xuyên suốt; P4 điều phối triển khai; cả nhóm nghiệm thu. Điền tên và hạn hoàn thành sau khi biết lịch làm việc, không tự coi số thứ tự là thời hạn.

| Mã | Thành viên | Người review | Hạn dự kiến |
|---|---|---|---|
| P1 | Chưa phân tên | P2 | Chưa chốt |
| P2 | Chưa phân tên | P1 + P3 | Chưa chốt |
| P3 | Chưa phân tên | P4 | Chưa chốt |
| P4 | Chưa phân tên | P3 | Chưa chốt |

## 3. Hợp đồng kỹ thuật chung

Đề xuất triển khai: TypeScript; web Next.js; API NestJS dạng modular monolith; PostgreSQL + PostGIS; lưu ảnh/tệp ở object storage. Redis chỉ thêm nếu dùng cho queue/cache, không giữ trạng thái phòng chuẩn. Chốt phiên bản và nhà cung cấp ở M0 trước khi khởi tạo code.

- [ ] Tổ chức `apps/web`, `apps/api`, `apps/worker` nếu cần; `packages/contracts`, `packages/database`, `packages/ui`.
- [ ] API dùng tiền tố `/api/v1`; P3 cập nhật OpenAPI, P2/P4 review trước khi thay đổi.
- [ ] Chia sẻ schema validation, enum và kiểu request/response; không sao chép kiểu dữ liệu riêng ở từng phần.
- [ ] Thành công: `{ "data": ..., "meta": { "requestId": "...", "nextCursor": null } }`.
- [ ] Lỗi: `{ "error": { "code": "ROOM_NOT_AVAILABLE", "message": "...", "fields": {} }, "requestId": "..." }`.
- [ ] Quy ước: 400 đầu vào sai; 401 chưa đăng nhập; 403 thiếu quyền; 404 không tồn tại; 409 xung đột trạng thái; 429 quá nhiều yêu cầu.
- [ ] ID UUID; mã phòng là chuỗi hiển thị; tiền là số nguyên VND; diện tích decimal; thời gian ISO 8601 UTC, giao diện đổi sang múi giờ hiển thị.
- [ ] Tọa độ API là `lat`, `lng`; GeoJSON là `[lng, lat]`; kiểm tra thứ tự ở adapter bản đồ.
- [ ] Danh sách phân trang cursor và thứ tự ổn định; map có giới hạn số marker, zoom xa trả nhóm.
- [ ] Cookie phiên HttpOnly, Secure ở môi trường HTTPS; bảo vệ CSRF và CORS theo origin triển khai.
- [ ] Client không gửi `ownerId`, `payerId`, `authorId` để quyết định quyền; server lấy danh tính từ phiên.
- [ ] Cập nhật phòng có `version`; phiên cũ gặp xung đột phải tải lại.
- [ ] Tạo lịch, giữ chỗ và đơn thanh toán dùng `Idempotency-Key` để retry không sinh bản ghi lặp.
- [ ] Sự kiện có `eventId`, `type`, `entityId`, `version`, `occurredAt`; reconnect phải tải lại snapshot hiện tại.
- [ ] Không commit secret, thông tin cá nhân thật hoặc tệp xác minh lên GitHub; cung cấp `.env.example` khi triển khai code.

## 4. Quy tắc nghiệp vụ bắt buộc

1. **Phòng khác tin đăng:** phòng là thực thể lâu dài; tin có vòng đời riêng. Tin thuê thường và tin chuyển nhượng cùng tham chiếu phòng.
2. **Lịch xem khác giữ chỗ:** tạo lịch không khóa phòng. Lịch giữ chỗ được ưu tiên theo quy tắc server, không theo dữ liệu đang hiện trên trình duyệt.
3. **Giữ chỗ trước thanh toán:** server cấp hold có thời hạn, MVP mặc định 15 phút và cho phép cấu hình; chỉ một hold active/phòng.
4. **Thanh toán chỉ tin xác nhận server:** quay về từ cổng thanh toán chưa đủ để ghi nhận PAID. Callback lặp không tạo cọc lặp.
5. **Thanh toán đến muộn:** nếu hold hết hạn/phòng thuộc người khác, đưa giao dịch vào NEEDS_REVIEW và quy trình đối soát/hoàn tiền; không khóa lại phòng đã được cấp cho người khác.
6. **Chốt thuê:** sau cọc và chủ xác nhận hợp đồng, phòng mới chuyển RENTED; không đồng nhất PAID với đã vào ở.
7. **Chuyển nhượng:** phòng vẫn RENTED trong lúc quảng bá; hoàn tất bàn giao mới kết thúc hợp đồng cũ và bắt đầu hợp đồng mới trong một transaction.
8. **Đánh giá:** chỉ người có cư trú đã bắt đầu, không bị vô hiệu hóa, mới được đánh giá; một đánh giá/người/hợp đồng. Người đang thuê cũng được đánh giá.
9. **Ẩn danh:** API công khai không trả danh tính tác giả đánh giá; quyền truy cập nội bộ phải được kiểm soát.
10. **Trùng phòng:** phòng chưa xác minh không được lên tìm kiếm công khai; phòng nghi trùng được admin xử lý, tránh xóa lịch sử giao dịch.

## 5. Thứ tự thực hiện và mốc nghiệm thu

| Mốc | Việc phải xong | Đầu ra nghiệm thu |
|---|---|---|
| M0 — Chốt thiết kế | Phạm vi, wireframe, ERD, state machine, API, stack và người làm | Nhóm thống nhất trường dữ liệu, quy tắc và mock response |
| M1 — Nền tảng | Auth, vai trò, phòng, ảnh, phân quyền, duyệt tin | Chủ tạo phòng; admin duyệt; tenant xem; người khác không sửa được |
| M2 — Khám phá | Search/map, chi tiết, yêu thích, so sánh, chatbot | Kết quả từ dữ liệu thật; list/map đồng bộ; filter chia sẻ bằng URL |
| M3 — Kết nối | Chat, lịch xem, lịch sử và thông báo | Hai tài khoản trao đổi và đặt/xác nhận/hủy lịch được |
| M4 — Thuê | Hold, cọc sandbox, khóa phòng, hợp đồng, cư trú | Hai người cùng giữ phòng chỉ một người thành công; callback lặp an toàn |
| M5 — Chuyển nhượng | Yêu cầu, duyệt, ứng viên, bàn giao và review | Hợp đồng cũ/mới nhất quán; chỉ người đủ điều kiện đánh giá |
| M6 — Demo | Kiểm thử tích hợp, sửa lỗi, triển khai, tài liệu vận hành | Chạy được toàn bộ kịch bản bên dưới từ môi trường sạch |

Mỗi mốc tích hợp ngay vào nhánh chung; không chờ cả bốn phần hoàn tất mới ghép. P1/P2 dùng fixture đúng schema trong lúc P3/P4 xây API. Mốc sau chỉ bắt đầu phần phụ thuộc khi hợp đồng mốc trước đã ổn định.

## 6. Kịch bản nghiệm thu xuyên suốt

- [ ] OWNER tạo tòa/phòng, upload ảnh, gửi duyệt; ADMIN duyệt; TENANT tìm thấy trên list và map.
- [ ] AGENT được cấp quyền có thể giới thiệu phòng; AGENT khác bị từ chối truy cập quản lý.
- [ ] Tenant lọc theo giá/khu vực, di chuyển map, mở phòng, lưu yêu thích và so sánh.
- [ ] Chatbot nhận nhu cầu và chỉ đề xuất các phòng đã duyệt; dữ liệu không có thì trả kết quả rỗng.
- [ ] Hai bên chat, đặt lịch, xác nhận; sau khi xem lưu kết quả và lịch sử.
- [ ] Hai tenant giữ cùng phòng đồng thời: chỉ một hold active; phía còn lại nhận lỗi rõ.
- [ ] Hold hết hạn tự mở lại phòng; callback thành công lặp không tạo thêm cọc.
- [ ] Callback đến muộn được đối soát; kết quả FAILED không ghi PAID hoặc chiếm phòng của người khác.
- [ ] Cọc thành công, chủ kích hoạt hợp đồng/cư trú; phòng RENTED và không nhận đặt mới.
- [ ] Tenant đang thuê yêu cầu chuyển nhượng; chủ duyệt; người thay ứng tuyển; bàn giao hoàn tất một lần.
- [ ] Review đúng điều kiện được công khai ẩn danh; tài khoản ngoài không đánh giá hoặc đọc danh tính tác giả.
- [ ] Một phiên sửa giá/trạng thái; phiên khác cập nhật; mất kết nối rồi nối lại vẫn lấy đúng dữ liệu.
- [ ] Truy cập tài nguyên người khác, giả danh role và sửa ID trong request đều bị chặn.
- [ ] UI dùng được trên mobile/desktop, bằng bàn phím; loading/error/empty có hướng xử lý.
- [ ] Demo triển khai HTTPS, migration/seed chạy được; backup được phục hồi trên database thử nghiệm.

## 7. Điều kiện hoàn thành và cách theo dõi

Một nhiệm vụ chỉ hoàn thành khi code được review, trường hợp lỗi chính được xử lý, kiểm thử phù hợp chạy qua, tài liệu/API được cập nhật và tích hợp vào bản demo. Lưu bằng chứng bằng PR, ảnh, log kiểm thử hoặc URL demo; không đánh dấu chỉ vì có giao diện.

Đề xuất bảng theo dõi: `ID | mô tả | P phụ trách | phụ thuộc | trạng thái | hạn | PR/bằng chứng`. Dùng các ID trong 4 file để tạo issue sau khi nhóm chốt repository. Không có issue nào được tạo tự động bởi bộ tài liệu này.

## 8. Quyết định cần chốt tại M0

- [ ] Tên 4 thành viên, hạn nộp và quỹ thời gian mỗi người.
- [ ] Nhà cung cấp map/geocoding, LLM, storage và sandbox payment; người giữ cấu hình.
- [ ] Phạm vi dữ liệu thí điểm và bộ ảnh được phép sử dụng.
- [ ] Quyền môi giới: MVP được đọc phòng được cấp, chat và xử lý lịch; chỉnh giá/trạng thái thuộc chủ/admin.
- [ ] Thời lượng lịch xem mặc định 30 phút, khoảng đệm và người tiếp khách; slot không trùng người/phòng.
- [ ] Mức cọc và quy tắc hủy/hoàn tiền dùng trong demo; chủ xác nhận thuê và bàn giao.
- [ ] Nơi triển khai, giới hạn chi phí và cách nghiệm thu hiệu năng. Đề xuất dataset thử 5.000 phòng, đo p95 search ≤ 1 giây ở 20 request đồng thời; ghi rõ cấu hình và tách thời gian dịch vụ ngoài.

Các giá trị mặc định trong tài liệu là đề xuất để lập trình; nhóm có thể điều chỉnh tại M0 và phải cập nhật cả API, UI, database khi thay đổi.
