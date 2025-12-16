export interface DaiHoiRecord {
  ID: string;
  Name: string;
  Year: string;
  Theme: string;
  Leader: string;
  Description: string;
  Location: string;
  Significance: string;
}

export const daiHoiData: DaiHoiRecord[] = [
  {
    ID: "0",
    Name: "Hội nghị thành lập Đảng",
    Year: "1930",
    Theme: "Thành lập Đảng Cộng sản Việt Nam",
    Leader: "Trần Phú",
    Description: "Mốc son chói lọi đánh dấu bước ngoặt lịch sử vĩ đại của cách mạng Việt Nam",
    Location: "Hương Cảng (Hong Kong)",
    Significance: "Thành lập Đảng Cộng sản Việt Nam, mở ra kỷ nguyên mới cho cách mạng Việt Nam"
  },
  {
    ID: "1",
    Name: "Đại hội lần thứ I",
    Year: "1935",
    Theme: "Chống đế quốc, chống chiến tranh",
    Leader: "Lê Hồng Phong",
    Description: "Đại hội xác định nhiệm vụ chống đế quốc và phản động phong kiến",
    Location: "Ma Cao",
    Significance: "Xác định đường lối cách mạng đúng đắn, phù hợp với tình hình trong nước và quốc tế"
  },
  {
    ID: "2",
    Name: "Đại hội lần thứ II",
    Year: "1951",
    Theme: "Kháng chiến, kiến quốc",
    Leader: "Hồ Chí Minh",
    Description: "Đại hội họp trong kháng chiến chống thực dân Pháp",
    Location: "Chiêm Hóa, Tuyên Quang",
    Significance: "Đề ra đường lối kháng chiến toàn dân toàn diện và tiến hành kháng chiến kiến quốc đồng thời"
  },
  {
    ID: "3",
    Name: "Đại hội lần thứ III",
    Year: "1960",
    Theme: "Xây dựng chủ nghĩa xã hội ở miền Bắc và đấu tranh hòa bình thống nhất nước nhà",
    Leader: "Lê Duẩn",
    Description: "Xác định nhiệm vụ cách mạng xã hội chủ nghĩa ở miền Bắc và đấu tranh thống nhất đất nước",
    Location: "Hà Nội",
    Significance: "Đề ra đường lối cách mạng hai chiến lược vừa xây dựng chủ nghĩa xã hội ở miền Bắc vừa giải phóng miền Nam"
  },
  {
    ID: "4",
    Name: "Đại hội lần thứ IV",
    Year: "1976",
    Theme: "Hoàn thành sự nghiệp thống nhất Tổ quốc, đưa cả nước đi lên chủ nghĩa xã hội",
    Leader: "Lê Duẩn",
    Description: "Đại hội họp sau khi đất nước hoàn toàn thống nhất",
    Location: "Hà Nội",
    Significance: "Xác định nhiệm vụ xây dựng chủ nghĩa xã hội trên phạm vi cả nước"
  },
  {
    ID: "5",
    Name: "Đại hội lần thứ V",
    Year: "1982",
    Theme: "Xây dựng chủ nghĩa xã hội và bảo vệ Tổ quốc xã hội chủ nghĩa",
    Leader: "Lê Duẩn",
    Description: "Đại hội đề ra nhiệm vụ phát triển kinh tế xã hội và bảo vệ Tổ quốc",
    Location: "Hà Nội",
    Significance: "Nhận diện những khó khăn trong công cuộc xây dựng chủ nghĩa xã hội"
  },
  {
    ID: "6",
    Name: "Đại hội lần thứ VI",
    Year: "1986",
    Theme: "Quyết tâm đổi mới",
    Leader: "Nguyễn Văn Linh",
    Description: "Đại hội khởi xướng công cuộc Đổi mới toàn diện đất nước",
    Location: "Hà Nội",
    Significance: "Mở ra thời kỳ Đổi mới, chuyển sang cơ chế thị trường định hướng xã hội chủ nghĩa"
  },
  {
    ID: "7",
    Name: "Đại hội lần thứ VII",
    Year: "1991",
    Theme: "Tiếp tục công cuộc đổi mới đưa đất nước tiến lên theo con đường xã hội chủ nghĩa",
    Leader: "Đỗ Mười",
    Description: "Tiếp tục đường lối đổi mới trong bối cảnh thế giới biến động",
    Location: "Hà Nội",
    Significance: "Khẳng định tiếp tục con đường đổi mới và xây dựng chủ nghĩa xã hội"
  },
  {
    ID: "8",
    Name: "Đại hội lần thứ VIII",
    Year: "1996",
    Theme: "Tiếp tục đổi mới, thực hiện công nghiệp hóa, hiện đại hóa đất nước",
    Leader: "Đỗ Mười",
    Description: "Xác định mục tiêu công nghiệp hóa, hiện đại hóa đất nước",
    Location: "Hà Nội",
    Significance: "Đề ra chiến lược công nghiệp hóa, hiện đại hóa"
  },
  {
    ID: "9",
    Name: "Đại hội lần thứ IX",
    Year: "2001",
    Theme: "Phát huy sức mạnh toàn dân tộc, đẩy mạnh công nghiệp hóa, hiện đại hóa",
    Leader: "Nông Đức Mạnh",
    Description: "Tiếp tục đẩy mạnh công nghiệp hóa hiện đại hóa, hội nhập quốc tế",
    Location: "Hà Nội",
    Significance: "Đưa đất nước hội nhập sâu rộng vào nền kinh tế thế giới"
  },
  {
    ID: "10",
    Name: "Đại hội lần thứ X",
    Year: "2006",
    Theme: "Phát huy sức mạnh toàn dân tộc, sớm đưa nước ta ra khỏi tình trạng kém phát triển",
    Leader: "Nông Đức Mạnh",
    Description: "Đặt mục tiêu vượt qua tình trạng kém phát triển",
    Location: "Hà Nội",
    Significance: "Định hướng phát triển đất nước trong giai đoạn 2006-2011"
  },
  {
    ID: "11",
    Name: "Đại hội lần thứ XI",
    Year: "2011",
    Theme: "Đẩy mạnh toàn diện công cuộc đổi mới đất nước",
    Leader: "Nguyễn Phú Trọng",
    Description: "Tiếp tục đẩy mạnh công cuộc đổi mới toàn diện",
    Location: "Hà Nội",
    Significance: "Khẳng định tiếp tục đẩy mạnh toàn diện công cuộc đổi mới"
  },
  {
    ID: "12",
    Name: "Đại hội lần thứ XII",
    Year: "2016",
    Theme: "Tăng cường xây dựng Đảng trong sạch, vững mạnh",
    Leader: "Nguyễn Phú Trọng",
    Description: "Tập trung xây dựng, chỉnh đốn Đảng toàn diện",
    Location: "Hà Nội",
    Significance: "Đẩy mạnh cuộc đấu tranh phòng chống tham nhũng, tiêu cực"
  },
  {
    ID: "13",
    Name: "Đại hội lần thứ XIII",
    Year: "2021",
    Theme: "Đoàn kết - Dân chủ - Kỷ cương - Sáng tạo - Phát triển",
    Leader: "Nguyễn Phú Trọng (2021-2024), Tô Lâm (2024-nay)",
    Description: "Khơi dậy khát vọng phát triển đất nước phồn vinh, hạnh phúc",
    Location: "Trung tâm Hội nghị Quốc gia, Hà Nội",
    Significance: "Đề ra khát vọng đưa Việt Nam trở thành nước phát triển, thu nhập cao vào năm 2045"
  }
];
