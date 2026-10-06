# P3 — Backend nghiệp vụ, bản đồ, tìm kiếm và đồng bộ

Mục tiêu: cung cấp API thật cho toàn bộ luồng MVP, kiểm soát quyền và xử lý trạng thái nhất quán. Phối hợp với P4 qua repository/transaction; không để client trực tiếp ghi database. Phạm vi chung theo [README](README.md).

## 1. Nền tảng và hợp đồng API

- [ ] **BE-01** Tạo các module users/access, properties/units/listings, search/geo, conversations, appointments, reservations/payments, contracts/residencies, transfers, reviews, notifications/admin.
- [ ] **BE-02** Xuất OpenAPI: request, response, allowedActions, phân trang, enum, lỗi và ví dụ cho tất cả endpoint ở file P2.
- [ ] **BE-03** Dùng DTO/schema chung; whitelist trường được sửa; không mass-assign owner, role, status hoặc giá từ dữ liệu không được phép.
- [ ] **BE-04** Gắn auth của P4, quyền theo vai trò + sở hữu/cấp quyền + trạng thái nghiệp vụ; kiểm tra cả đọc và ghi.
- [ ] **BE-05** Thêm requestId, validation, xử lý lỗi tập trung; log không chứa mật khẩu, token, nội dung hợp đồng hoặc payload nhạy cảm.
- [ ] **BE-06** Lưu Idempotency-Key theo actor/route/request hash; retry cùng payload trả cùng kết quả; cùng key khác payload nhận conflict.
- [ ] **BE-07** API trả version và allowedActions; PATCH phòng yêu cầu expected version để tránh ghi đè phiên cũ.

## 2. Quản lý phòng và xác minh

- [ ] **BE-08** API chủ tạo/sửa tòa nhà và phòng, ảnh, tiện ích, giá và chi phí; quyền OWNER không cho sửa phòng người khác.
- [ ] **BE-09** Mã phòng sinh ổn định và duy nhất; listing mới không tạo lại unit nếu cùng phòng thực tế.
- [ ] **BE-10** Cấp/rút quyền agent theo unit; agent đọc phòng được cấp, xử lý lịch/hội thoại được giao, không tự đổi giá hoặc xác minh.
- [ ] **BE-11** Tin DRAFT → PENDING_REVIEW → PUBLISHED hoặc REJECTED; sửa địa chỉ/giá/ảnh quan trọng theo chính sách gửi duyệt lại.
- [ ] **BE-12** API công khai chỉ đọc tin PUBLISHED của tòa/phòng được xác minh, không bị ẩn, và đủ điều kiện theo chế độ tìm kiếm.
- [ ] **BE-13** Cảnh báo nghi trùng theo tòa/địa chỉ chuẩn hóa, số phòng, tầng và tọa độ; không dùng giá làm định danh.
- [ ] **BE-14** Admin xử lý candidate: liên kết đúng unit hoặc từ chối bản trùng; chỉ merge tự động khi không có giao dịch/lịch/hợp đồng cần bảo toàn. Trường hợp có lịch sử giữ bản ghi, chuyển liên kết theo quy trình và audit.
- [ ] **BE-15** Lưu audit cho thay đổi giá, trạng thái, quyền agent, duyệt tin và xử lý trùng.

## 3. Tìm kiếm và map

### Hợp đồng đầu vào

`GET /rooms/search` và `GET /map/rooms` dùng cùng schema filter:

| Trường | Ý nghĩa và kiểm tra |
|---|---|
| `mode` | rent hoặc transfer; mặc định rent |
| `bbox` | west,south,east,north; kiểm tra khoảng và thứ tự |
| `lat,lng,radiusMeters` | Thay bbox; radius có giới hạn cấu hình, không nhận đồng thời hai chế độ |
| `minPrice,maxPrice` | Số nguyên VND/tháng, không âm và min ≤ max |
| `minArea,maxArea` | Diện tích m², không âm |
| `amenityIds` | ID hợp lệ; MVP phải có đủ tiện ích đã chọn |
| `availableFrom` | Ngày muốn vào ở; xử lý theo listing và mode |
| `sort` | relevance, price_asc, price_desc, newest, distance; distance cần tâm |
| `cursor,limit` | Cursor ổn định; giới hạn đề xuất 20 mặc định, tối đa 50 |
| `zoom` | Chỉ map; quyết định marker/cluster |

- [ ] **BE-16** Tạo một search predicate dùng chung cho list/map/assistant; tránh ba cách lọc khác nhau.
- [ ] **BE-17** Search rent trả phòng AVAILABLE; detail có thể hiển thị phòng vừa HELD/RESERVED với CTA tương ứng. Transfer tìm theo tin chuyển nhượng OPEN của phòng RENTED.
- [ ] **BE-18** Filter giá/diện tích/tiện ích/ngày/khu vực chạy tại DB; không tải toàn bộ rồi lọc trong API.
- [ ] **BE-19** Radius dùng ST_DWithin với geography theo mét; khoảng cách trả riêng là khoảng cách thẳng.
- [ ] **BE-20** Bbox dùng spatial predicate có index; thứ tự lng/lat được kiểm thử với tọa độ thí điểm.
- [ ] **BE-21** Pagination có tie-breaker ID, cursor gắn filter/sort; filter đổi thì cursor cũ bị từ chối hoặc reset theo contract.
- [ ] **BE-22** List trả unitId/listingId, preview, version, status, giá/chi phí, vị trí công khai, cursor/count và query fingerprint.
- [ ] **BE-23** Map zoom xa trả cluster `{ count, center, bbox }`; zoom gần trả marker `{ unitId, listingId, lat, lng, price, version, status }` có giới hạn, thông báo cần zoom nếu quá nhiều.
- [ ] **BE-24** Map/list dùng fingerprint cùng điều kiện; query độc lập không hứa snapshot tuyệt đối, detail/đặt phòng phải kiểm tra lại.
- [ ] **BE-25** Geocoding endpoint `GET /geo/places?q=...` trả ID, tên, tọa độ; có timeout/rate limit và cache theo chính sách nhà cung cấp.
- [ ] **BE-26** Chi phí dự kiến tách thuê, điện/nước theo định mức giả định, phí cố định và khoản chưa biết; không cộng phí theo đơn giá thành tổng tháng nếu thiếu mức tiêu thụ.
- [ ] **BE-27** Nếu có routing, gọi dịch vụ cho shortlist giới hạn; lỗi routing vẫn trả kết quả với distance và ghi chưa có travel time.

## 4. Chatbot tìm phòng

- [ ] **BE-28** `POST /assistant/search` nhận message/context giới hạn; trích nhu cầu thành filter theo schema, không đưa SQL cho LLM thực thi.
- [ ] **BE-29** Thiếu vị trí/ngân sách quan trọng thì trả clarification; địa điểm mơ hồ trả lựa chọn geocoding để người dùng xác nhận.
- [ ] **BE-30** Server validate filter rồi gọi cùng SearchService; model không cấp quyền hoặc đổi trạng thái dữ liệu.
- [ ] **BE-31** Xếp hạng theo tiêu chí công khai: budget, khoảng cách, tiện ích; filter cứng không bị score vượt qua.
- [ ] **BE-32** Trả interpretedFilters, room IDs/cards, matchReasons và assumptions; mọi đề xuất phải thuộc tập kết quả thật.
- [ ] **BE-33** Không có kết quả thì gợi ý nới điều kiện, không âm thầm bỏ filter; model lỗi có thể trả bộ lọc thủ công.
- [ ] **BE-34** Rate limit và giới hạn token/chi phí; không gửi số điện thoại, hợp đồng hay nội dung chat riêng sang LLM.

## 5. Chat, lịch xem và lịch sử

- [ ] **BE-35** Tạo hội thoại tenant với chủ hoặc agent được phép; người tiếp nhận/contact được server xác minh.
- [ ] **BE-36** Đọc/gửi tin chỉ cho participant; phân trang tin; clientMessageId duy nhất/người gửi để retry không trùng.
- [ ] **BE-37** Realtime chỉ vào channel được quyền, nhận lại quyền khi agent bị thu hồi hoặc user bị khóa.
- [ ] **BE-38** Sinh slot theo thời gian tiếp khách, lịch của phòng/người tiếp, múi giờ và thời lượng M0; không nhận timestamp tùy ý ngoài slot.
- [ ] **BE-39** Tạo PENDING với transaction chống trùng slot; có hạn chờ xác nhận cấu hình được, hết hạn thì EXPIRED và nhả slot.
- [ ] **BE-40** Chủ/agent được phân xác nhận; tenant hoặc người tiếp có quyền hủy; lưu lý do và thời điểm.
- [ ] **BE-41** Lịch PENDING/CONFIRMED chiếm slot phòng và người tiếp; CANCELLED/EXPIRED không chiếm.
- [ ] **BE-42** COMPLETE chỉ sau thời điểm lịch theo chính sách, lưu kết quả/viewing history; không đánh dấu đã xem khi mới đặt.
- [ ] **BE-43** Khi HELD tạm chặn lịch mới; khi RESERVED hủy các lịch tương lai và thông báo, giữ lịch sử.

## 6. State machine phải chốt và triển khai

| Thực thể | Trạng thái / chuyển hợp lệ |
|---|---|
| Unit | AVAILABLE → HELD → RESERVED → RENTED; HELD hết hạn/hủy → AVAILABLE; MAINTENANCE/INACTIVE chỉ khi không phá hold/hợp đồng active |
| Listing | DRAFT → PENDING_REVIEW → PUBLISHED hoặc REJECTED; PUBLISHED → PAUSED/EXPIRED; thay đổi cần duyệt theo chính sách |
| Appointment | PENDING → CONFIRMED → COMPLETED; PENDING/CONFIRMED → CANCELLED; PENDING → EXPIRED |
| Reservation | ACTIVE → CONVERTED, EXPIRED hoặc CANCELLED |
| Payment order | CREATED → PENDING → PAID hoặc FAILED; bất thường → NEEDS_REVIEW; PAID → REFUND_PENDING → REFUNDED |
| Contract | DRAFT → ACTIVE → EXPIRED hoặc TERMINATED; không có hai contract ACTIVE cùng unit |
| Transfer | DRAFT → OWNER_APPROVAL_PENDING → OPEN → CANDIDATE_SELECTED → HANDOVER → COMPLETED; nhánh REJECTED/CANCELLED theo quyền |

Phòng chưa được xác minh không công khai dù physical status AVAILABLE. Transfer có trạng thái riêng; không đổi RENTED thành AVAILABLE khi chủ mới chỉ duyệt tin.

## 7. Giữ chỗ, cọc và hợp đồng

- [ ] **BE-44** `POST /reservations`: kiểm tra actor/room, lock unit, xử lý hold cũ đã hết hạn, tạo một hold ACTIVE, đổi HELD, ghi audit/outbox trong một transaction.
- [ ] **BE-45** Deadline theo thời gian server, mặc định 15 phút; P4 chạy worker hết hạn. API vẫn kiểm tra expiresAt nếu worker chậm.
- [ ] **BE-46** Tạo payment order chỉ cho chủ hold còn hiệu lực; amount/currency lấy từ snapshot server, không tin số tiền client.
- [ ] **BE-47** Gọi gateway ngoài transaction DB qua adapter; dùng merchant order ID ổn định để retry không tạo hai checkout. Lưu order trước khi gọi và có recovery khi timeout.
- [ ] **BE-48** Webhook xác minh chữ ký/raw payload và môi trường; đối chiếu provider order, amount, currency, người giữ và thời hạn.
- [ ] **BE-49** Callback thành công: lock order/reservation/unit theo thứ tự thống nhất, idempotency theo provider event/transaction; chuyển PAID + CONVERTED + RESERVED, hủy lịch và tạo outbox atomically.
- [ ] **BE-50** Callback đến muộn hoặc xung đột: lưu bằng chứng giao dịch và NEEDS_REVIEW; admin có quy trình đối soát/hoàn tiền, không chiếm lại unit.
- [ ] **BE-51** Failed/cancel không đánh dấu PAID; trạng thái đơn không tự mở phòng nếu còn hold hiệu lực khác.
- [ ] **BE-52** Chủ hủy cọc đã PAID phải theo action và hoàn tiền thử nghiệm; không PATCH trực tiếp room AVAILABLE để bỏ giao dịch.
- [ ] **BE-53** Tạo contract DRAFT từ cọc, tenant và owner; snapshot rent/deposit; tệp lưu private qua P4.
- [ ] **BE-54** Chủ xác nhận activate: kiểm tra reservation/payment, contract/date/residency, atomically tạo ACTIVE và RENTED; phát sự kiện sau commit.
- [ ] **BE-55** Kết thúc hợp đồng có reason/date, đóng residency, xử lý tiền cọc theo quy tắc và kiểm tra không còn transfer đang bàn giao; không tự mở phòng khi còn cư trú active.
- [ ] **BE-56** Thống nhất worker hợp đồng hết hạn với P4: hợp đồng và cư trú cập nhật trong transaction; hợp đồng quá hạn còn người ở tạo việc xử lý cho chủ thay vì tự bán lại phòng.

## 8. Chuyển nhượng và đánh giá

- [ ] **BE-57** Chỉ tenant đang có cư trú/hợp đồng ACTIVE yêu cầu transfer; một transfer đang mở/hợp đồng.
- [ ] **BE-58** Chủ duyệt nội dung/ngày/điều kiện; chỉ sau approve mới OPEN và tìm kiếm công khai.
- [ ] **BE-59** Người khác ứng tuyển một lần; được rút trước khi chọn/bàn giao; applicant không đọc dữ liệu hợp đồng riêng của tenant cũ.
- [ ] **BE-60** Chủ chọn candidate hợp lệ; khóa ứng tuyển/chọn lại theo state; chuyển HANDOVER khi điều kiện đã đủ.
- [ ] **BE-61** MVP bàn giao do chủ xác nhận sau khi hai bên xác nhận thỏa thuận; khoản cọc mới dùng sandbox nếu có, khoản xử lý ngoài hệ thống ghi rõ theo thỏa thuận, không giả lập đã chuyển tiền thật.
- [ ] **BE-62** COMPLETE trong một transaction: lock unit/transfer/contracts, validate candidate/ngày/settlement, kết thúc contract/residency cũ, kích hoạt contract/residency mới, vẫn RENTED, đóng transfer/listing.
- [ ] **BE-63** Hủy/từ chối có lý do và quy trình xử lý payment liên quan; retry bàn giao không tạo thêm hợp đồng.
- [ ] **BE-64** Review eligibility lấy từ residency bắt đầu thật và không bị vô hiệu; một author/contract; cấm fake review bằng contractId người khác.
- [ ] **BE-65** Công khai review không trả authorId/name/avatar; admin có quyền xử lý và audit, tránh lộ danh tính qua endpoint khác.

## 9. Đồng bộ, quản trị và kiểm thử

- [ ] **BE-66** Mọi mutation quan trọng ghi outbox cùng transaction; emit sau commit, không báo thành công trước khi DB lưu.
- [ ] **BE-67** Các event: unit.updated/status_changed, listing.changed, appointment.changed, message.created, payment.updated, contract.changed, transfer.changed, notification.created.
- [ ] **BE-68** Public event chỉ có thông tin phòng cần hiển thị; private event theo user/participant; eventId/version hỗ trợ xử lý lặp.
- [ ] **BE-69** API snapshot/reconnect cho P2; notification persist qua P4; khi cập nhật public room, cache search/map nếu có phải invalidated đúng.
- [ ] **BE-70** Admin endpoints cho duyệt/reject/ẩn listing, xử lý duplicate/report, khóa user, ẩn review, xem payment NEEDS_REVIEW và audit; chốt action schema ở OpenAPI.
- [ ] **BE-71** Test filter/bbox/radius/coordinates, pagination, transfer search và assistant grounding bằng dataset biết trước.
- [ ] **BE-72** Test quyền tài nguyên, channel chat, media contract và review anonymity bằng nhiều tài khoản.
- [ ] **BE-73** Test concurrent hold, lịch slot trùng, callback lặp/sai chữ ký/sai số tiền, hết hạn vs callback và hoàn tất transfer đồng thời.
- [ ] **BE-74** Test rollback không để room/payment/contract khác trạng thái; worker chạy lại và lỗi dịch vụ ngoài có recovery.
- [ ] **BE-75** Cùng P4 đo query plan/p95 theo M0; tối ưu dựa trên số đo, không thêm cache che lỗi query.

Hoàn thành khi API thật có tài liệu, kiểm thử các bất biến quan trọng qua và mọi kịch bản README chạy được với P2; có log/bằng chứng và không còn endpoint mô phỏng bị hiểu là thật.
