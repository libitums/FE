// Story 카드의 베트남어 글입니다. en.ts의 에피소드마다 넷을 채운다 — 빠지면 타입 검사가 짚는다. 제목은 내장 번역표(`translations.vi`)의 제목. 번역은 초안 — 원어민 검수 필요.
import type { StoryEpisodeId, StoryEpisodeText } from "../episodes.contract";

export const vi: Record<StoryEpisodeId, StoryEpisodeText> = {
  "u10-laundry": {
    when: "Ngày 3 · Chiều",
    title: "Giặt đồ",
    teaser: "Mọi nút bấm trong tiệm giặt đều là tiếng Hàn.",
    alt: "Bảng hiệu tiệm giặt xu 24 giờ sáng đèn trên cửa kính ở cuối con hẻm hanok ngày mưa",
  },
  "u09-subway": {
    when: "Ngày 3 · Sáng",
    title: "Đi tàu điện ngầm",
    teaser: "Ba màu, ba mũi tên, một buổi sáng mưa dưới lòng đất.",
    alt: "Lối ra số 4 mái kính của ga Jongno 3-ga vào một sáng mưa, bậc thang dẫn xuống lòng đất",
  },
  "u08-umbrella": {
    when: "Ngày 2 · Tối",
    title: "Mưa bất chợt",
    teaser: "Bạn mở cửa quán cà phê bước vào cơn mưa xối xả, và có ai đó theo bạn ra ngoài.",
    alt: "Mưa lớn trút xuống con hẻm hanok thắp đèn lồng trong đêm, nhìn từ dưới một chiếc ô tối màu",
  },
  "u07-jaemin": {
    when: "Ngày 2 · Chiều",
    title: "Nhầm chỗ ngồi",
    teaser: "Chỗ ngồi nhiều nắng nhất trong quán có vẻ còn trống. Thật ra thì không.",
    alt: "Một chiếc ô đen dài dựng ở góc chỗ ngồi bên cửa sổ quán cà phê ngập nắng dưới trời trong",
  },
  "u06-cafe": {
    when: "Ngày 2 · Sáng",
    title: "Gọi cà phê",
    teaser: "Quán cà phê khóa cửa tối qua giờ đã sáng đèn.",
    alt: "Một quán cà phê ở góc con hẻm hanok buổi sáng nắng, biển hiệu sáng đèn",
  },
  "u05-baekban": {
    when: "Ngày 1 · Tối",
    title: "Ăn một mình",
    teaser: "Thực đơn viết tay, không ảnh, và một câu hỏi bạn không ngờ tới.",
    alt: "Nồi canh kimchi sôi sùng sục cùng bát cơm và các món phụ trên bàn ăn ở nhà hàng",
  },
  "u04-directions": {
    when: "Ngày 1 · Tối",
    title: "Tìm nhà hàng",
    teaser: "Họ bảo năm phút thôi. Bạn đã đi qua chậu hoa này hai lần.",
    alt: "Con hẻm hanok thắp đèn lồng lúc hoàng hôn rẽ thành nhiều lối trông giống nhau",
  },
  "u03-mina": {
    when: "Ngày 1 · Chiều",
    title: "Gặp Mina",
    teaser: "Bốn chiếc giường tầng, một tấm bản đồ vẽ tay và một câu hỏi về tên bạn.",
    alt: "Một bàn tay cầm mẩu giấy nhỏ có bản đồ vẽ tay trong phòng ký túc ngập nắng",
  },
  "u02-checkin": {
    when: "Ngày 1 · Chiều",
    title: "Nhận phòng",
    teaser: "Phòng 201 hé mở, và ba lô của ai đó đã nằm trên giường.",
    alt: "Cánh cửa hé mở của phòng ký túc với giường tầng và một chiếc ba lô trên giường cạnh cửa sổ",
  },
  "u01-water": {
    when: "Ngày 1 · Chiều",
    title: "Mua nước",
    teaser: "Khát, lạc đường, kéo theo vali. Cửa hàng đầu tiên bạn tìm thấy bé xíu.",
    alt: "Con hẻm hanok yên tĩnh trong nắng chiều nhìn từ cửa cửa hàng tiện lợi, nhà nghỉ ở phía trong",
  },
  "u00-tutorial": {
    when: "Ngày 0 · Đến nơi",
    title: "Hướng dẫn",
    teaser: "Những lời tiếng Hàn đầu tiên sắp bật ra khỏi miệng bạn. Bạn còn chưa biết chúng.",
    alt: "Cửa hàng tiện lợi ban đêm như trong mơ: một cốc mì xào cay cỡ lớn và một gimbap tam giác trên bàn cạnh cửa sổ",
  },
};
