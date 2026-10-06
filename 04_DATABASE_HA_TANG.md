# P4 — Database, truy vấn, auth và hạ tầng

Mục tiêu: dữ liệu có cấu trúc rõ, giữ đúng bất biến khi nhiều thao tác đồng thời và triển khai được từ môi trường sạch. Phối hợp P3 về nghiệp vụ/transaction; P2 về auth/upload; phạm vi theo [README](README.md).

## 1. Checklist thiết kế chung

- [ ] **DB-01** Vẽ ERD, mô tả mỗi bảng, cardinality, khóa ngoại, quyền đọc/ghi và trường nhạy cảm.
- [ ] **DB-02** Chốt enum/state machine với P3; bảng trạng thái được chia sẻ cho P1/P2, không có enum riêng mỗi ứng dụng.
- [ ] **DB-03** Thiết lập PostgreSQL/PostGIS, migrations có version, ORM/query builder và raw SQL có parameter cho spatial/locking.
- [ ] **DB-04** UUID PK, created_at/updated_at UTC, version cho thực thể sửa đồng thời; amount nguyên VND, diện tích decimal.
- [ ] **DB-05** Tách dữ liệu current với snapshot contract/payment để đổi giá phòng không sửa giao dịch cũ.
- [ ] **DB-06** Thiết kế archive/status thay vì cascade xóa payment/contract/audit; chỉ cascade dữ liệu phụ không cần lịch sử sau review.

## 2. Data dictionary tối thiểu

Các trường dưới đây là lõi bắt buộc; thêm timestamp/version/status và index phù hợp. P4 phải chốt schema chi tiết và nullability tại M0.

| Bảng | Trường chính | Quan hệ / ràng buộc |
|---|---|---|
| users | id, email_normalized, phone_normalized?, password_hash, display_name, status | email unique; chỉ account quản trị được cấp ADMIN |
| user_roles | user_id, role | unique(user_id, role); OWNER/AGENT cần cơ chế cấp/duyệt |
| sessions | id_hash, user_id, expires_at, revoked_at | token ngẫu nhiên lưu hash; thu hồi khi logout/khóa user |
| properties | id, owner_id, name, address_text, address_normalized, city, location, verification_status | geography(Point,4326), OWNER sở hữu |
| units | id, property_id, code, room_number_normalized, floor, area_m2, rent_vnd, deposit_vnd, status, version | code unique; unique(property_id, room_number_normalized); nếu trùng số thì mã phòng nội bộ phải phân biệt |
| unit_costs | unit_id, electricity_rate, water_rate, water_mode, service_fee_vnd, parking_fee_vnd, other_fee_vnd | CHECK không âm; water_mode per_m3/per_person/fixed; ghi đơn vị và trường chưa biết |
| amenities / unit_amenities | id, code, label / unit_id, amenity_id | amenity code unique; unique(unit_id, amenity_id) |
| unit_agent_permissions | unit_id, agent_id, granted_by, granted_at, revoked_at | một quyền hiện hành/unit/agent; dùng được cho query scope |
| listings | id, unit_id, kind, transfer_id?, title, description, available_from, minimum_months, status, published_at, expires_at | kind RENT/TRANSFER; một tin public cùng loại/unit; transfer link hợp lệ |
| media | id, uploader_id, object_key, purpose, mime, bytes, status | object_key unique, không dùng URL ký làm định danh |
| listing_media | listing_id, media_id, position | unique(listing_id,media_id), thứ tự rõ |
| duplicate_candidates | unit_id, possible_unit_id, reasons, score, resolution, reviewed_by | cặp ứng viên unique, không tự gộp có giao dịch |
| favorites | user_id, unit_id | unique(user_id, unit_id) |
| conversations / participants | id, unit_id / conversation_id, user_id | participant unique; scope liên hệ được phép |
| messages | id, conversation_id, sender_id, client_message_id, body, sent_at | unique(sender_id, client_message_id); body giới hạn độ dài |
| appointments | id, unit_id, tenant_id, host_id, starts_at, ends_at, status, confirmation_expires_at, cancellation_reason | end > start; chống overlap room và host khi PENDING/CONFIRMED |
| viewing_history | appointment_id, tenant_id, unit_id, viewed_at, result, notes | một bản ghi/appointment; chỉ sau xác nhận đã xem |
| reservations | id, unit_id, tenant_id, expires_at, status, deposit_snapshot_vnd | một ACTIVE/unit; amount không âm, deadline server |
| payment_orders | id, reservation_id?, transfer_id?, payer_id, amount_vnd, currency, provider, merchant_order_id, provider_order_id?, status | đúng một nguồn reservation/transfer; merchant_order unique |
| payment_events | id, order_id, provider, provider_event_id, provider_transaction_id?, payload_hash, verified_at, result | unique(provider, provider_event_id); đối soát transaction ID |
| deposits | id, order_id, unit_id, tenant_id, amount_vnd, status | unique(order_id); không ghi cọc mới do callback lặp |
| refunds | id, deposit_id, provider_refund_id?, amount_vnd, status, reason | sum refunded không vượt deposit; idempotency theo refund request |
| contracts | id, unit_id, owner_id, tenant_id, reservation_id?, transfer_id?, start_date, end_date, rent_snapshot_vnd, deposit_snapshot_vnd, media_id?, status | một ACTIVE/unit; end > start; liên kết nguồn không tái sử dụng |
| residencies | id, contract_id, user_id, move_in_at, move_out_at?, status | unique(contract_id,user_id); dữ liệu tối thiểu, không dùng giấy tờ thật trong seed |
| transfer_requests | id, contract_id, requested_by, desired_date, reason, status, owner_approved_by?, selected_application_id? | một transfer đang mở/contract; chosen application thuộc đúng transfer |
| transfer_applications | id, transfer_id, applicant_id, status, note | unique(transfer_id,applicant_id); không tự ứng tuyển phòng mình đang thuê |
| handover_records | id, transfer_id, confirmed_by, agreed_at, settlement_status, old_contract_id, new_contract_id | unique(transfer_id); snapshot thỏa thuận, không khẳng định đã trả tiền nếu chưa có chứng cứ |
| reviews | id, contract_id, unit_id, author_id, rating, content, status | unique(author_id,contract_id); rating 1–5; public projection ẩn author |
| reports | id, reporter_id, target_type, target_id, reason, status, handled_by? | target hợp lệ theo service; rate limit và audit xử lý |
| notifications | id, user_id, source_event_id, type, entity_id, payload_minimal, read_at | unique(user_id,source_event_id,type); query theo user/time; không lưu payload nhạy cảm dư thừa |
| unit_status_history | id, unit_id, from_status, to_status, actor_id?, reason, changed_at | lịch sử append-only cùng transaction đổi trạng thái |
| audit_logs | id, actor_id?, action, entity_type, entity_id, changes_redacted, created_at | log tối thiểu, bỏ secret và thông tin riêng không cần thiết |
| idempotency_keys | actor_id, route, key, request_hash, response_ref, status, expires_at | unique(actor_id,route,key); giữ đủ lâu để retry/đối soát theo chính sách |
| outbox_events | id, type, entity_id, version, payload_minimal, occurred_at, processed_at?, attempts, next_attempt_at | ghi cùng transaction; xử lý ít nhất một lần, consumer chống lặp |

Không dùng một cột `is_available` cho cả tin, lịch, thanh toán và hợp đồng. Vị trí chuẩn lưu ở property; nếu unit khác vị trí thì có override rõ và truy vấn vẫn dùng một nguồn chuẩn.

## 3. Ràng buộc và transaction

- [ ] **DB-07** CHECK giá/diện tích/phí hợp lệ, ngày đúng thứ tự; enum hoặc CHECK cho status/kind.
- [ ] **DB-08** Partial unique index reservation(unit_id) khi ACTIVE; service phải expire hold cũ trong transaction trước khi tạo mới. Không dùng `now()` trong điều kiện partial index để tự hết hạn.
- [ ] **DB-09** Partial unique contract(unit_id) khi ACTIVE; lifecycle không tự tạo khoảng trống cho hợp đồng thứ hai khi chưa bàn giao.
- [ ] **DB-10** Partial unique cho transfer đang mở và listing public; chốt tập status cùng P3.
- [ ] **DB-11** Appointment dùng khoảng `[starts_at, ends_at)`; exclusion constraint room+range và host+range cho PENDING/CONFIRMED hoặc cơ chế khóa tương đương có test đồng thời. Khoảng đệm phải được đưa vào vùng bị chặn.
- [ ] **DB-12** Quản lý kết nối/pool, timeout và thứ tự lock thống nhất; retry deadlock/serialization có giới hạn và giữ idempotency.
- [ ] **DB-13** Repository `createHold` khóa unit, expire hold cũ, kiểm tra available, insert reservation, update unit/history/outbox; commit hoặc rollback toàn bộ.
- [ ] **DB-14** Repository `applyVerifiedPayment` lock order/reservation/unit, kiểm tra deadline/event/amount; PAID/deposit/RESERVED/history/outbox cập nhật cùng transaction.
- [ ] **DB-15** Repository `expireHold` khóa và kiểm tra lại status/deadline/order; không mở phòng đã converted hoặc thuộc reservation mới.
- [ ] **DB-16** Repository `activateContract` kiểm tra source/deposit và tạo residency/RENTED trong cùng transaction.
- [ ] **DB-17** Repository `completeTransfer` lock unit/transfer/contracts, kết thúc contract cũ trước khi active contract mới, tạo handover unique; rollback nếu thiếu bất cứ điều kiện nào.
- [ ] **DB-18** Update phòng theo `id + version`; affected rows = 0 trả conflict, không update lại tự động làm mất sửa đổi của người khác.
- [ ] **DB-19** Mọi đường đổi room status đều đi qua service/repository chuẩn; không có admin endpoint bỏ qua payment/contract invariants.
- [ ] **DB-20** Không gọi gateway/LLM/map trong transaction giữ lock; lưu ý định trước, gọi ngoài, đối soát kết quả sau.

## 4. Repository và tối ưu query

- [ ] **DB-21** Giao interface/query cho P3: scoped unit read/update, search predicate, marker/cluster, slots, hold/payment, contract/transfer, public review và audit.
- [ ] **DB-22** GiST index trên vị trí dùng spatial search; query dùng phép có thể khai thác index.
- [ ] **DB-23** B-tree/partial index cho listing status/kind/unit, units(property,status,price), permissions(agent,unit), reservations status/deadline và contract owner/tenant.
- [ ] **DB-24** Index appointments(unit,start), (host,start), messages(conversation,sent_at,id), notifications(user,created_at,id), outbox(next_attempt_at) chưa xử lý.
- [ ] **DB-25** Index join tiện ích và favorites; uniqueness/index FK có chọn lọc theo query thực tế.
- [ ] **DB-26** Select projection đủ dùng, không `SELECT *` trả dữ liệu riêng; tránh N+1 ảnh/tiện ích/quyền.
- [ ] **DB-27** List/map chung predicate; cursor và tie-breaker ổn định; có test nhiều phòng cùng giá/thời gian.
- [ ] **DB-28** Dùng EXPLAIN ANALYZE trên dataset thử; ghi plan/thời gian, thống kê p95 và cấu hình máy theo mục tiêu M0.
- [ ] **DB-29** Không thêm index mọi cột hoặc cache toàn bộ phòng; chỉ tối ưu khi có đo lường, xác định quy tắc invalidation nếu cache.

## 5. Auth và bảo vệ dữ liệu

- [ ] **DB-30** Triển khai đăng ký/login/logout/me/update profile theo contract P2; hash mật khẩu bằng thư viện chuẩn, không tự thiết kế thuật toán.
- [ ] **DB-31** Tạo session cookie HttpOnly, Secure trên HTTPS, SameSite phù hợp; hạn phiên, revoke, CSRF, CORS theo origin và rate limit login.
- [ ] **DB-32** Đăng ký tự phục vụ mặc định TENANT; cấp OWNER/AGENT qua quy trình xác minh demo; ADMIN chỉ seed/admin hiện có, không nhận role tự do từ client.
- [ ] **DB-33** Role không thay ownership; cung cấp query scope/helper cho P3, test user A không đọc/sửa contract/payment/chat user B.
- [ ] **DB-34** Public DTO review không chứa author; log/admin response không vô tình mở dữ liệu riêng cho role khác.
- [ ] **DB-35** Secret lấy từ môi trường/deployment secrets; `.env.example` chỉ có placeholder, không đưa secret vào frontend bundle.
- [ ] **DB-36** Dữ liệu demo hư cấu và ảnh được phép dùng; seed không chứa email/phone/hợp đồng thật hoặc mật khẩu mặc định trên public deployment.

## 6. Upload, worker và vận hành

- [ ] **DB-37** Storage adapter: ảnh public theo chính sách; hợp đồng/tệp xác minh private, signed URL ngắn hạn chỉ cấp sau kiểm tra quyền.
- [ ] **DB-38** `POST /media/uploads` kiểm tra actor, purpose, MIME/size/count; hoàn tất upload phải xác minh object/metadata, không tin file extension hoặc URL client tự cung cấp.
- [ ] **DB-39** P3 attach media vào listing/contract sau khi kiểm tra uploader/quyền; không chấp nhận path tùy ý hoặc ảnh của người khác.
- [ ] **DB-40** Worker expire hold, expire lịch PENDING, nhắc hợp đồng, xử lý hợp đồng đến hạn và outbox; chạy lại không tạo tác động lặp.
- [ ] **DB-41** Khi contract đến hạn nhưng residency còn active, tạo thông báo/chờ chủ xử lý; không tự AVAILABLE. Quy trình worker theo state machine P3.
- [ ] **DB-42** Outbox publish có retry/backoff và pending/error visibility; đánh dấu processed sau xử lý, chống lặp ở notification/event consumer.
- [ ] **DB-43** Reconcile payment PENDING/NEEDS_REVIEW qua adapter sandbox, không chỉ dựa callback; refund thử nghiệm có trạng thái và log.
- [ ] **DB-44** Tạo môi trường local bằng container hoặc cách tương đương, health/readiness endpoint, seed và lệnh migration rõ.
- [ ] **DB-45** CI: lint, typecheck, kiểm thử API/DB liên quan, build và migration trên DB tạm; không truy cập DB production từ test.
- [ ] **DB-46** Deploy demo web/API/DB/storage/worker; HTTPS, origin, cookies, callback sandbox và health check đúng.
- [ ] **DB-47** Log cấu trúc có requestId, lỗi worker, payment pending, deadlock; bỏ dữ liệu nhạy cảm trước log.
- [ ] **DB-48** Backup database theo lịch phù hợp demo; kiểm tra restore trên DB thử và ghi lệnh phục hồi; snapshot trước migration nguy hiểm.
- [ ] **DB-49** Tài liệu vận hành: cấu hình, migration, seed, khởi động worker, restart, xử lý outbox lỗi/payment bất thường và rollback bản phát hành.

## 7. Seed và kiểm thử bắt buộc

- [ ] **DB-50** Seed đủ 4 vai trò, hai chủ khác nhau, agent được/không được cấp quyền, nhiều tenant và admin thử nghiệm.
- [ ] **DB-51** Seed phòng ở nhiều tọa độ, cùng giá, thiếu phí/ảnh, nhiều tiện ích, tin chờ duyệt/ẩn, HELD/RESERVED/RENTED và transfer OPEN.
- [ ] **DB-52** Seed contract active/đã kết thúc, residency bắt đầu/chưa bắt đầu, review đủ/không đủ quyền và payment lỗi.
- [ ] **DB-53** Kiểm tra migration + seed từ DB sạch, unique/check/FK, raw query parameterization và constraint room/host overlap.
- [ ] **DB-54** Chạy hai request song song cho hold/appointment/payment/transfer; chỉ một kết quả hợp lệ, rollback không mất tính toàn vẹn.
- [ ] **DB-55** Test worker chậm/lặp, callback muộn/lặp, outbox gửi lại, database restart và hết session.
- [ ] **DB-56** So sánh kết quả radius/bbox với tọa độ biết trước và đo query plan trên dataset M0.
- [ ] **DB-57** Kiểm thử auth/access/media privacy, hợp đồng của người khác và public review không lộ author.
- [ ] **DB-58** Phục hồi backup vào DB thử rồi chạy lại smoke test search/login/contract.

## 8. Nghiệm thu P4

- [ ] ERD/data dictionary được P3 review; schema và code khớp, migrations trong Git.
- [ ] P3 dùng được repository/transaction mà không lặp logic truy vấn hoặc phá ràng buộc.
- [ ] Auth/upload/worker có tài liệu và kiểm thử lỗi quan trọng.
- [ ] Bản demo chạy sau hướng dẫn trên môi trường sạch; backup/restore đã thử.
- [ ] Có bằng chứng số đo query và kiểm thử concurrency; không đánh dấu hoàn thành chỉ vì database tạo được bảng.

Khi triển khai code, P4 bổ sung hướng dẫn chạy và cấu hình vào README hiện tại; không coi bộ tài liệu kế hoạch này là bằng chứng hệ thống đã hoàn thành.
