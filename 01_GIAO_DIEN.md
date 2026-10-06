# P1 — Thiết kế và xây dựng giao diện

Mục tiêu: cung cấp đầy đủ màn hình/component responsive để P2 nối dữ liệu và hành vi. Phạm vi MVP và thuật ngữ theo [README](README.md).

## 1. Ranh giới và bàn giao

- P1 sở hữu layout, màu sắc, typography, component, accessibility và trạng thái hiển thị.
- P2 sở hữu state nghiệp vụ, route, gọi API, validation thực thi và cập nhật dữ liệu.
- Component nhận dữ liệu/callback qua props; không gắn API trực tiếp hoặc tự quyết định trạng thái phòng.
- Bàn giao: wireframe, sơ đồ điều hướng, component chạy với fixture, danh mục màn hình và bằng chứng kiểm tra responsive.

## 2. Checklist thiết kế nền tảng

- [ ] **UI-01** Vẽ sitemap cho khách, tenant, owner, agent, admin; đánh dấu màn hình cần đăng nhập.
- [ ] **UI-02** Vẽ wireframe các luồng M1–M5, thể hiện cả hộp thoại và màn hình lỗi.
- [ ] **UI-03** Tạo token màu, font, khoảng cách, border, radius và shadow; tập trung tại một nơi.
- [ ] **UI-04** Chốt nút: chính nền màu chủ đạo; phụ có viền; nguy hiểm có màu cảnh báo và xác nhận; loading có spinner và tránh nhấn lặp.
- [ ] **UI-05** Chốt kích thước tương tác tối thiểu 44×44 px, góc bo nút khoảng 8–12 px; focus nhìn thấy được.
- [ ] **UI-06** Xây Button, IconButton, Input, Select, Checkbox, DateTimePicker, Badge, Card, Tabs, Table, Pagination, Dialog/Drawer, Toast và Skeleton.
- [ ] **UI-07** Form có label, dấu bắt buộc, helper/error; không dùng placeholder thay label.
- [ ] **UI-08** Modal giữ focus, đóng bằng Escape nếu an toàn, trả focus về nút mở; thao tác đang giao dịch không đóng làm mất thông tin.
- [ ] **UI-09** Kiểm tra kích thước 360, 768, 1280 px; không tràn ngang trừ bảng so sánh có vùng cuộn rõ.

## 3. Cấu trúc màn hình phải xây

| ID / Route gợi ý | Bố cục và thành phần | Nút/click bàn giao cho P2 |
|---|---|---|
| UI-10 `/login`, `/register` | Form giữa trang, chuyển đăng nhập/đăng ký, lỗi từng trường | Đăng nhập, tạo tài khoản, hiện mật khẩu |
| UI-11 `/profile` | Hồ sơ, vai trò hiện có, chỉnh thông tin | Lưu, đăng xuất |
| UI-12 `/rooms` | Thanh search trên; list trái khoảng 40%, map phải khoảng 60%; mobile tabs | Tìm, lọc, xóa lọc, tìm khu vực này, mở phòng |
| UI-13 `/rooms/:id` | Gallery, giá/chi phí, mô tả, tiện ích, vị trí, tình trạng, người liên hệ | Yêu thích, so sánh, chat, lịch xem, giữ chỗ |
| UI-14 `/favorites`, `/compare` | Cards đã lưu; bảng tối đa 3 cột phòng, hàng chi phí/tiện ích | Bỏ lưu, thêm/bỏ so sánh, mở phòng |
| UI-15 Chatbot trên `/rooms` | Drawer hội thoại, filter đã hiểu, card kết quả, câu hỏi bổ sung | Gửi, áp dụng bộ lọc, xem đề xuất |
| UI-16 `/messages` | Danh sách hội thoại và khung chat; mobile mở từng hội thoại | Chọn liên hệ, gửi, tải tin cũ, thử lại |
| UI-17 `/appointments` | Tab sắp tới/lịch sử, trạng thái, chi tiết người tiếp và giờ | Đặt, xác nhận, hủy, đánh dấu đã xem |
| UI-18 `/reservations/:id` | Tóm tắt phòng/cọc, đếm thời gian giữ chỗ, tiến trình | Thanh toán sandbox, hủy giữ chỗ, tải lại trạng thái |
| UI-19 `/contracts`, `/contracts/:id` | Danh sách, tệp hợp đồng, người thuê, thời hạn và cư trú | Xem tệp, chủ kích hoạt/kết thúc, yêu cầu chuyển nhượng |
| UI-20 `/transfers`, `/transfers/:id` | Tin chuyển nhượng, ngày bàn giao, điều kiện, tiến trình | Ứng tuyển, rút ứng tuyển, theo dõi |
| UI-21 `/reviews/new` | Hợp đồng đủ điều kiện, điểm 1–5, nội dung, giải thích ẩn danh | Gửi đánh giá, sửa nội dung theo quyền |
| UI-22 `/owner` | Thống kê phòng và việc cần xử lý | Quản lý phòng, lịch, cọc, hợp đồng, chuyển nhượng |
| UI-23 `/owner/properties`, `/owner/units` | Bảng có ảnh, mã, giá và trạng thái; form tạo/sửa/upload | Thêm tòa/phòng, lưu, gửi duyệt, cấp quyền agent |
| UI-24 `/agent` | Kho phòng được cấp, khách trong hội thoại, lịch dẫn, lịch sử xem | Mở phòng, chat, xác nhận lịch, ghi kết quả |
| UI-25 `/owner/transfers` | Yêu cầu, ứng viên, trạng thái bàn giao | Duyệt/từ chối, chọn ứng viên, xác nhận bàn giao |
| UI-26 `/admin` | Tabs tin chờ duyệt, phòng nghi trùng, users, reports, payments, reviews, audit | Duyệt/từ chối, ẩn tin, khóa user, xử lý báo cáo |
| UI-27 `/notifications` | Danh sách thông báo có thời gian, đã đọc/chưa đọc | Mở tài nguyên, đánh dấu đã đọc |
| UI-28 Trang hệ thống | 403, 404, lỗi mạng, hết phiên | Quay lại, đăng nhập, thử lại |

Route chỉ là hợp đồng gợi ý; P1/P2 chốt sitemap trước khi viết code.

## 4. Chi tiết trang tìm phòng và bản đồ

- [ ] **UI-29** Thanh search có vị trí, ngân sách; bộ lọc mở rộng có diện tích, tiện ích và ngày vào ở.
- [ ] **UI-30** Card gồm ảnh, tiêu đề, mã phòng, giá/tháng, chi phí đã biết, diện tích, khu vực, badge xác minh và trạng thái.
- [ ] **UI-31** Thiếu phí thì ghi “chưa có thông tin”; không hiển thị tổng chi phí chắc chắn khi còn thiếu thành phần.
- [ ] **UI-32** Marker hiển thị giá; marker đang chọn nổi bật; nhóm có số lượng; click nhóm phóng gần.
- [ ] **UI-33** Click card/marker hiển thị cùng phòng; card đang chọn có viền/focus rõ.
- [ ] **UI-34** Có nút “Tìm trong khu vực này”, thông báo map đang tải/lỗi và phương án tiếp tục bằng danh sách.
- [ ] **UI-35** Mobile có list/map tabs, filter drawer, panel chi tiết ngắn trên map và nút mở đầy đủ.
- [ ] **UI-36** Khi không có kết quả, hiển thị filter đang áp dụng và nút nới/xóa điều kiện; không tự bịa kết quả.

## 5. Trạng thái nút và giao dịch

| Ngữ cảnh | Cách hiển thị bắt buộc |
|---|---|
| Khách chưa đăng nhập | Có thể xem phòng; hành động cần tài khoản mở đăng nhập và giữ ý định |
| Phòng AVAILABLE + tin đã duyệt | Cho liên hệ, đặt lịch và giữ chỗ |
| Phòng HELD | Hiện đang được giữ; chỉ chủ hold có thể tiếp tục; người khác không có nút giữ mới |
| Phòng RESERVED | Hiện đã cọc; không mời đặt lịch/đặt cọc mới |
| Phòng RENTED | Không cho thuê thường; tin chuyển nhượng có CTA riêng khi đã duyệt |
| Phòng MAINTENANCE / INACTIVE | Không giao dịch; dashboard có thông tin lý do |
| Thanh toán PENDING | Hiện đang chờ xác nhận server, tránh thông báo thành công sớm |
| Hold hết hạn | Dừng đếm, thông báo hết hạn và nút kiểm tra lại phòng |
| Version xung đột | Hiện dữ liệu đã thay đổi, nút tải phiên mới |
| Chuyển nhượng chờ duyệt | Hiện tiến trình; không coi đã công khai hoặc hoàn tất |

- [ ] **UI-37** Dùng enum chia sẻ; không biến mọi trạng thái thành boolean còn/hết phòng.
- [ ] **UI-38** Hủy lịch, kết thúc hợp đồng, từ chối chuyển nhượng có xác nhận và ô lý do khi nghiệp vụ yêu cầu.
- [ ] **UI-39** Luôn ghi nhãn “Thanh toán thử nghiệm” ở luồng sandbox; không dùng nội dung khiến người xem hiểu đã chuyển tiền thật.
- [ ] **UI-40** Review công khai chỉ hiện “Người thuê đã xác thực”, không hiện tên/avatar thật.

## 6. Mẫu hợp đồng component với P2

| Component | Props cần thống nhất | Callback |
|---|---|---|
| RoomCard | room, selected, favorite, loading | onOpen, onFavorite, onCompare |
| SearchFilters | value, errors, loading | onChange, onApply, onReset |
| RoomMap | markers/clusters, viewport, selectedId, loading/error | onViewportChange, onSelect, onSearchArea |
| AppointmentForm | slots, selectedSlot, submitting, errors | onSelectSlot, onSubmit |
| ReservationPanel | reservation, expiresAt, serverNow, paymentState | onPay, onCancel, onRefresh |
| UnitEditor | initialValue, amenities, media, permissions, errors | onUpload, onSubmit, onCancel |
| TransferTimeline | transfer, allowedActions, candidates | onApprove, onApply, onSelect, onComplete |

- [ ] **UI-41** Tạo fixture chứa phòng thiếu ảnh, tên dài, giá lớn, lỗi quyền, không còn phòng và không có kết quả.
- [ ] **UI-42** Giao catalog/demo component cho P2; dùng cùng fixture với API mock.

## 7. Nghiệm thu P1

- [ ] Tất cả route trong phạm vi có layout và trạng thái loading/error/empty/success phù hợp.
- [ ] Không có nút trang trí gây hiểu nhầm là đã hoạt động; hành động chưa nối được ghi rõ trong demo nội bộ.
- [ ] Mobile/desktop, bàn phím, focus, label và tương phản được kiểm tra; map có danh sách thay thế.
- [ ] Văn bản tiếng Việt thống nhất, tiền/ngày giờ đúng format chung.
- [ ] P2 nối được component mà không phải dựng lại cấu trúc giao diện.
- [ ] Lưu ảnh minh chứng các luồng chính và review với P2 tại mỗi mốc.
