
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DO $$
DECLARE
  t TEXT := 'phenomebeauty';
  c UUID; b UUID;
BEGIN
  -- Create profiles
  INSERT INTO profiles (id,email,full_name,phone,address,role,tenant_id) VALUES (gen_random_uuid(),'tammyhartnic@gmail.com','Tammy Hartnic','0834523011','11 Simonsvlei Road, Haasendal, Kuilsriver','client',t) RETURNING id INTO c;
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-11-29','15:00','17:00','completed',780,390,true,true,t,'2025-11-29 17:00:00+02',120) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t),(b,'64dc218b-1a2e-4d3a-880e-79b33f4e1b72','Full Gel Pedicure',380,60,2,t);
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-12-23','18:00','19:20','completed',370,185,true,true,t,'2025-12-23 19:20:00+02',80) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'6c11e222-e936-488d-828c-bf8e0cdbfd36','Full Gel Manicure',300,60,1,t),(b,'46322cb4-3e5a-4b9e-95d2-5336406eafc8','Soak Off Gel',70,20,2,t);
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2026-01-17','09:00','11:00','completed',780,390,true,true,t,'2026-01-17 11:00:00+02',120) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t),(b,'64dc218b-1a2e-4d3a-880e-79b33f4e1b72','Full Gel Pedicure',380,60,2,t);

  INSERT INTO profiles (id,email,full_name,phone,address,role,tenant_id) VALUES (gen_random_uuid(),'ghadijaha@gmail.com','Ghadijah','0790917432','171 Murray Street, Goodwood','client',t) RETURNING id INTO c;
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-11-06','18:00','21:05','completed',1190,595,true,true,t,'2025-11-06 21:05:00+02',185) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t),(b,'d67a9f7c-7bc6-4957-9676-ecff833894d3','Underarm',90,15,2,t),(b,'55847161-1e92-45e5-993f-7a114cbdfb21','Full Arm',350,50,3,t),(b,'56ccac71-0a38-47b4-a533-adfb55360e38','Full Leg',350,60,4,t);
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-12-06','11:00','14:05','completed',1190,595,true,true,t,'2025-12-06 14:05:00+02',185) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t),(b,'d67a9f7c-7bc6-4957-9676-ecff833894d3','Underarm',90,15,2,t),(b,'55847161-1e92-45e5-993f-7a114cbdfb21','Full Arm',350,50,3,t),(b,'56ccac71-0a38-47b4-a533-adfb55360e38','Full Leg',350,60,4,t);

  INSERT INTO profiles (id,email,full_name,phone,address,role,tenant_id) VALUES (gen_random_uuid(),'pp0447515@gmail.com','Arshad Segal','0844297240','14c, 14 York Road','client',t) RETURNING id INTO c;
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-11-28','20:00','20:50','completed',320,160,true,true,t,'2025-11-28 20:50:00+02',50) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'fcfbcba0-5e6d-4721-8a59-1ef954a704bb','Brazilian',320,50,1,t);
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-12-24','19:00','20:00','completed',400,200,true,true,t,'2025-12-24 20:00:00+02',60) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t);

  INSERT INTO profiles (id,email,full_name,phone,address,role,tenant_id) VALUES (gen_random_uuid(),'jadasheldon96@gmail.com','Jada Sheldon','0793388724','35 Alberton Street, Portlands, Mitchells Plain','client',t) RETURNING id INTO c;
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-12-30','19:00','20:00','completed',400,200,true,true,t,'2025-12-30 20:00:00+02',60) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t);
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-12-31','13:30','14:30','completed',400,200,true,true,t,'2025-12-31 14:30:00+02',60) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t);

  INSERT INTO profiles (id,email,full_name,phone,address,role,tenant_id) VALUES (gen_random_uuid(),'jessicawarnercharl@gmail.com','Jessica Warner','5206607385','37 Briza Road, Tableview','client',t) RETURNING id INTO c;
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-12-27','13:00','14:50','completed',740,370,true,true,t,'2025-12-27 14:50:00+02',110) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t),(b,'a2142f34-2e4b-4f3b-a2c3-dcd26ce2ad8d','Full Face (Including Eyebrow)',340,50,2,t);
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-12-30','13:00','14:15','completed',490,245,true,true,t,'2025-12-30 14:15:00+02',75) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t),(b,'d67a9f7c-7bc6-4957-9676-ecff833894d3','Underarm',90,15,2,t);

  INSERT INTO profiles (id,email,full_name,phone,address,role,tenant_id) VALUES (gen_random_uuid(),'aqmiya@yahoo.com','Ayanda Miya','0793396498','Woodstock','client',t) RETURNING id INTO c;
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2025-12-31','18:00','19:00','completed',400,200,true,true,t,'2025-12-31 19:00:00+02',60) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'22e37f92-e67d-48e1-a657-a267cf8bc3a8','Hollywood',400,60,1,t);

  INSERT INTO profiles (id,email,full_name,phone,address,role,tenant_id) VALUES (gen_random_uuid(),'haneemrylands11@gmail.com','Haneem Rylands','0849867487','10 Corby Close, Grassy Park','client',t) RETURNING id INTO c;
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2026-01-03','10:00','11:40','completed',630,315,true,true,t,'2026-01-03 11:40:00+02',100) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'56ccac71-0a38-47b4-a533-adfb55360e38','Full Leg',350,60,1,t),(b,'553b0cc0-ae48-4b0f-a003-230f66efe97c','Half Arm',280,40,2,t);

  INSERT INTO profiles (id,email,full_name,phone,address,role,tenant_id) VALUES (gen_random_uuid(),'samanthaarison87@gmail.com','Samantha Baadjies','0621779008','34 Stella Way, Tafelsig, Mitchells Plain','client',t) RETURNING id INTO c;
  INSERT INTO bookings (client_id,staff_id,booking_date,start_time,end_time,status,total_amount,deposit_amount,deposit_paid,full_payment_received,tenant_id,completed_at,service_duration_minutes) VALUES (c,NULL,'2026-01-04','11:00','11:50','completed',340,170,true,true,t,'2026-01-04 11:50:00+02',50) RETURNING id INTO b;
  INSERT INTO booking_items (booking_id,service_id,service_name,price,duration_minutes,sort_order,tenant_id) VALUES (b,'a2142f34-2e4b-4f3b-a2c3-dcd26ce2ad8d','Full Face (Including Eyebrow)',340,50,1,t);
END $$;
