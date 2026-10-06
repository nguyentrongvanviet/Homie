# P2 — Logic giao diện, API và đồng bộ phía trình duyệt

Mục tiêu: mọi click/form trong giao diện dẫn đến hành vi đúng, có kiểm soát lỗi và dữ liệu cập nhật. Quy tắc chung theo [README](README.md); P1 làm component, P3/P4 cung cấp API.

## 1. Checklist nền tảng

- [ ] **FE-01** Thiết lập routing/layout theo vai trò; xử lý URL trực tiếp, 403/404 và chuyển hướng sau đăng nhập.
- [ ] **FE-02** Tạo API client tập trung: base URL, cookie credentials, timeout, error mapping, requestId và hủy request.
- [ ] **FE-03** Dùng contract/schema chia sẻ; tạo mock response đúng hợp đồng trước khi API thật sẵn sàng.
- [ ] **FE-04** Quản lý server state bằng query cache; UI state như modal, tab, phòng chọn tách khỏi dữ liệu server.
- [ ] **FE-05** Query key gồm filter chuẩn hóa, viewport, cursor và tài khoản khi cần; xóa cache riêng tư khi logout/đổi tài khoản.
- [ ] **FE-06** Auth qua cookie HttpOnly; không lưu token phiên trong localStorage; xử lý CSRF theo cơ chế server.
- [ ] **FE-07** Refresh/tải lại trang vẫn khôi phục được tài khoản; 401 yêu cầu đăng nhập lại, không lặp request vô hạn.
- [ ] **FE-08** Kiểm tra form bằng schema chung; hiển thị lỗi từng trường và lỗi server; vẫn để server kiểm tra quyền.
- [ ] **FE-09** Mutation có pending state; hành động quan trọng không tự retry mù; dùng lại Idempotency-Key khi retry cùng thao tác.

## 2. Bảng hành động → API → kết quả

Tiền tố mọi endpoint là `/api/v1`. Đây là hợp đồng cần chốt với P3/P4 ở M0.

| ID / Thao tác | API và đầu vào chính | Hành vi khi thành công / lỗi |
|---|---|---|
| FE-10 Đăng ký/đăng nhập | `POST /auth/register`, `/auth/login`; thông tin form | Tải `/auth/me`, về returnTo an toàn; lỗi gắn đúng trường |
| FE-11 Logout/hồ sơ | `POST /auth/logout`; `PATCH /users/me` | Xóa cache riêng tư; cập nhật hồ sơ |
| FE-12 Tìm phòng | `GET /rooms/search`; filter, bbox hoặc center/radius, cursor | Cập nhật list, tổng và map theo cùng điều kiện |
| FE-13 Tải marker | `GET /map/rooms`; cùng filter, bbox, zoom | Nhận marker/cluster có giới hạn; xử lý map lỗi riêng |
| FE-14 Mở phòng | `GET /rooms/:unitId` | Chi tiết và allowedActions; 404/tin ẩn có thông báo |
| FE-15 Yêu thích | `PUT /favorites/:unitId`, `DELETE /favorites/:unitId`; `GET /favorites` | Optimistic được phép, rollback nếu lỗi |
| FE-16 So sánh | `GET /rooms/compare?ids=...` | Tối đa 3 ID duy nhất; báo phòng không còn công khai |
| FE-17 Chatbot | `POST /assistant/search`; message, context có giới hạn | Hiện interpretedFilters, câu hỏi hoặc kết quả; áp dụng filter có xác nhận người dùng |
| FE-18 Mở chat/gửi tin | `POST /conversations`; unitId, contactId; `GET/POST /conversations/:id/messages` | Mở đúng hội thoại; tin pending có clientMessageId để retry |
| FE-19 Chọn lịch xem | `GET /units/:id/appointment-slots`; date, contactId | Chỉ hiện slot server trả; không tự suy ra còn chỗ |
| FE-20 Đặt lịch | `POST /appointments`; unitId, contactId, slotStart, note | Hiện PENDING; 409 tải lại slot |
| FE-21 Xử lý lịch | `POST /appointments/:id/confirm`, `/cancel`, `/complete`; lý do/kết quả | Làm mới lịch và lịch sử; kiểm tra quyền bằng allowedActions |
| FE-22 Giữ chỗ | `POST /reservations`; unitId | Hiện expiresAt/serverNow và trang reservation; 409 báo phòng không còn |
| FE-23 Xem/hủy hold | `GET /reservations/:id`; `POST /reservations/:id/cancel` | Tải trạng thái chuẩn, không chỉ sửa state local |
| FE-24 Thanh toán | `POST /reservations/:id/payment-orders`; `GET /payment-orders/:id` | Mở checkout URL được server cấp; return page chỉ tải trạng thái |
| FE-25 Quản lý tòa/phòng | `GET/POST /properties`; `GET/POST /properties/:id/units`; `PATCH /units/:id` | Lưu version; 409 giữ nội dung form và yêu cầu reload/đối chiếu |
| FE-26 Tin/ảnh/quyền agent | `POST/PATCH /units/:id/listings`; `POST /listings/:id/submit`; `POST /media/uploads`; `PUT/DELETE /units/:id/agents/:agentId` | Hiện trạng thái duyệt; upload có tiến trình và thử lại |
| FE-27 Hợp đồng/cư trú | `GET/POST /contracts`; `POST /contracts/:id/activate`, `/terminate`; `GET /contracts/:id/residencies` | Tải hợp đồng/phòng/cư trú sau mutation |
| FE-28 Chuyển nhượng | `POST /transfers`; contractId, desiredDate, reason; `GET /transfers` và `/:id` | Theo dõi yêu cầu; chưa duyệt không hiển thị như tin công khai |
| FE-29 Duyệt/ứng tuyển | `POST /transfers/:id/approve`, `/reject`, `/applications`; `DELETE /transfers/:id/applications/me` | Cập nhật timeline, danh sách ứng viên theo quyền |
| FE-30 Chọn/bàn giao | `POST /transfers/:id/select-candidate`, `/complete`, `/cancel` | Hiện điều kiện chưa đạt; hoàn tất tải lại hai hợp đồng |
| FE-31 Review/báo cáo | `GET /reviews/eligibility`; `POST /reviews`; `POST /reports` | Chỉ chọn hợp đồng đủ điều kiện; báo cáo có mã theo dõi |
| FE-32 Notifications | `GET /notifications`; `POST /notifications/:id/read` | Cập nhật unread count và mở tài nguyên còn quyền truy cập |
| FE-33 Admin | `GET /admin/{listings,duplicate-candidates,users,reports,payments,reviews,audit-logs}`; action endpoints theo OpenAPI | Phân trang; xác nhận thao tác; server quyết định quyền |

P3 định nghĩa payload/response chi tiết trước khi nối từng nhóm. P2 không tự tạo endpoint khác hoặc phụ thuộc trực tiếp bảng database.

## 3. Tìm kiếm, URL và bản đồ

- [ ] **FE-34** Lưu vị trí, giá, diện tích, tiện ích, ngày vào ở, sort và chế độ rent/transfer trong URL; parse dữ liệu sai về mặc định an toàn.
- [ ] **FE-35** Tách text người dùng nhập khỏi filter đã áp dụng; nút tìm mới commit filter và reset cursor.
- [ ] **FE-36** Geocoding qua API server; người dùng chọn đúng gợi ý địa điểm rồi mới dùng tọa độ.
- [ ] **FE-37** Chuẩn hóa điều kiện địa lý: bbox hoặc radius; nếu đổi chế độ phải xóa điều kiện cũ tránh giao nhau ngoài ý muốn.
- [ ] **FE-38** Di chuyển map cập nhật viewport; MVP nhấn “Tìm trong khu vực này” mới truy vấn. Gợi ý địa điểm debounce khoảng 300 ms và cấu hình được.
- [ ] **FE-39** List/map dùng cùng filterVersion hoặc query fingerprint; bỏ response cũ và hủy request superseded.
- [ ] **FE-40** Click marker chọn unitId và card tương ứng; mở chi tiết không phá URL tìm kiếm trước đó.
- [ ] **FE-41** Marker chưa có card trong trang hiện tại được lấy preview theo ID; không tự thêm vào kết quả phân trang sai thứ tự.
- [ ] **FE-42** Click cluster zoom hoặc chuyển tới bbox nhóm; map lỗi vẫn dùng search list được.
- [ ] **FE-43** Load more nối bằng ID duy nhất; đổi filter/reset session không giữ dữ liệu cũ.
- [ ] **FE-44** Xin quyền vị trí chỉ khi người dùng chọn “Gần tôi”; từ chối thì nhập địa điểm; không lưu vị trí cá nhân ngoài mục đích đã chọn.
- [ ] **FE-45** So sánh lưu danh sách ID không nhạy cảm; reload tải giá/trạng thái mới, không coi snapshot cũ là giá hiện tại.

## 4. Đồng bộ và cache

- [ ] **FE-46** Kết nối kênh realtime sau auth; chỉ subscribe tài nguyên server cho phép; public room event không chứa dữ liệu người thuê.
- [ ] **FE-47** Nhận `unit.updated`, `unit.status_changed`, `listing.changed`: cập nhật/invalidate detail, search, map, compare và dashboard liên quan.
- [ ] **FE-48** Chỉ áp dụng version mới hơn; event trùng không tạo toast/tin nhắn lặp.
- [ ] **FE-49** Khi reconnect hoặc tab trở lại sau offline, refetch snapshot; không giả định đã nhận toàn bộ sự kiện.
- [ ] **FE-50** Nhận `appointment.changed`, `payment.updated`, `transfer.changed`, `notification.created`: làm mới đúng cache và count.
- [ ] **FE-51** Không optimistic với giữ chỗ, PAID, chốt hợp đồng và hoàn tất chuyển nhượng; đợi server xác nhận.
- [ ] **FE-52** Khi sửa phòng, gửi version cũ; giữ bản nháp khi conflict để người dùng không mất nội dung.
- [ ] **FE-53** Đếm hold dựa trên expiresAt/serverNow; đến hạn tải lại; client clock không có quyền mở khóa phòng.
- [ ] **FE-54** Sau checkout, polling trạng thái có giới hạn và backoff nếu realtime chưa tới; hết thời gian chờ hiện hướng kiểm tra lại.
- [ ] **FE-55** Hiển thị trạng thái kết nối; retry sau lỗi mạng không sinh lịch, tin nhắn hay payment order mới.

## 5. Logic riêng theo vai trò

- [ ] **FE-56** OWNER: editor tòa/phòng, upload, gửi duyệt, cấp/rút quyền agent, xử lý lịch/cọc/hợp đồng/chuyển nhượng.
- [ ] **FE-57** AGENT: chỉ kho được cấp, lịch được phân, hội thoại của mình; không có nút đổi giá hoặc xác minh.
- [ ] **FE-58** TENANT: lịch, hold, payment, hợp đồng và transfer của mình; không đọc dữ liệu người thuê khác.
- [ ] **FE-59** ADMIN: màn hình duyệt/duplicate/report/payment/review/user/audit; thao tác có lý do và không tự gọi DELETE để mất lịch sử.
- [ ] **FE-60** Mọi nút nhạy cảm lấy allowedActions từ response; kiểm tra client chỉ phục vụ UX, không thay quyền server.
- [ ] **FE-61** Tệp hợp đồng tải qua URL ngắn hạn; không persist link riêng tư trong localStorage hoặc log trình duyệt.

## 6. Kiểm thử và nghiệm thu P2

- [ ] **FE-62** Luồng auth + returnTo, hết phiên, 403 và logout không còn cache riêng tư.
- [ ] **FE-63** Thay filter nhanh và kéo map không hiện kết quả cũ; back/reload khôi phục bộ lọc.
- [ ] **FE-64** Nhấn submit hai lần/retry mạng không tạo giao dịch lặp.
- [ ] **FE-65** Hai phiên thấy cùng thay đổi phòng; reconnect tải lại đúng.
- [ ] **FE-66** Checkout return không tự ghi PAID; hold expired/409 có hướng xử lý rõ.
- [ ] **FE-67** Chat gửi lại không trùng; người ngoài không mở hội thoại bằng URL đoán ID.
- [ ] **FE-68** Chạy E2E các kịch bản README cùng P3/P4; lưu lỗi và bằng chứng cho từng mốc.
- [ ] **FE-69** Thống nhất với P1 mọi trạng thái chưa có UI; không bỏ lỗi bằng toast chung khó hiểu.

Hoàn thành khi mọi nút trong phạm vi có hành vi đúng và luồng demo chạy với API thật; fixture chỉ dùng phát triển và kiểm thử.
