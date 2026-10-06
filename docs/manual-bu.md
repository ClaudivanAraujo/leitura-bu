1.3. Por que QR Code e como ele foi implantado? 
Recentemente, a tecnologia QR Code tornou-se ubíqua: está presente nas mais variadas mídias e 
é facilmente utilizada com o suporte dos mais variados dispositivos, sobretudo nos smartphones. A grande capacidade de representação de dados, aliada ao forte suporte nos dispositivos mveis, 
faz do QR Code uma escolha natural para a digitalização rápida do boletim de urna. 
Devido às limitaçs da impressora da urna (impressora térmica capaz de imprimir imagens 
monocromáticas de baixa resolução), o QR Code impresso está limitado à representação de 
até 1.100 caracteres no modo de entrada alfanumérico2. Dessa forma, é possível trabalhar com uma taxa de compressão adequada ao mesmo tempo em que é possível utilizar um formato de representação que seja legível por pessoas usando aplicativos de leitura genéricos. Essa 
característica é importante para o fácil desenvolvimento de aplicativos específicos de leitura 
do boletim de urna por pessoas com pouco ou nenhum conhecimento do processo eleitoral brasileiro. 
A utilização do modo de entrada alfanumérico restringe a utilização de nomes no conteo 
codificado no QR Code. Uma vez que a língua portuguesa é rica em nomes com caracteres 
acentuados, o armazenamento de nomes no QR Code (nomes de candidatos, cargos e eleiçs) também implicaria a utilização de mais imagens para representar todo o boletim, porque 
demandariaomodo de entrada binário. Dessa forma, todos osnomesforam suprimidos. Ainda 
assim, os boletins de urna podem ser muito extensos, chegando a apresentar até mesmo 4 QR Codes, devido ao grande nero de candidatos. 
O Software de Votação utiliza a biblioteca libqrencode3 para a geração de QR Codes. 
1.4. Formato de representação do boletim de urna 
O boletim de urna é codificado no QR Code utilizando somente os caracteres previstos no modo 
de entrada alfanumérico (letras, neros, alguns sinais de pontuação e espaço em branco). A partir daí foi criada uma estrutura simples do tipo chave e valor. Todos os registros estão na mesma linha, com a chave separada do valor pelo caractere de dois pontos, e os registros separados por espaço em branco. Todo QR Code possui três seçs: cabeçalho, conteo do boletim e segurança. 
Cada QR Code está limitado a 1.100 caracteres, incluindo todas as três seções. A seção de conteúdo poder ser dividida para que o limite máximo de cada QR Code não seja ultrapassado. Isso é feito no último espaço em branco antes da posição de quebra, de modo que um registro fique 
dividido entre dois QR Codes, retirando-se esse espaço em branco. Ao remontar integralmente a 
seção de conteúdo do boletim é necessário adicionar novamente esse espaço em branco, para fins de cálculo de hash e assinatura digital. 
2 Disponível em https://en.wikipedia.org/wiki/QR_code#Storage 3 Disponível em https://github.com/fukuchi/libqrencode 
1.4.1. Cabeçalho 
Campo Descrição 
Marca de início dos dados. 
QRBU:n:x n = índice do QR Code em uma sequência de QR Codes.   x = quantidade total de QR Codes. 
Nero da versão do formato da representação do boletim de urna. VRQR:n.y n = nero de ciclos eleitorais desde sua implementação. y = nero de reviss do formato dentro de um ciclo. 


1.4.2. Conteo do boletim 
Cabeçalho do boletim de urna 
Campo Descrição 
ORIG:xxxx  Origem do boletim de urna (VOTA, RED ou SA).  
ORLC:xxx  Origem da configuração do processo eleitoral (LEG – eleição legal oficial;COM – eleição comunitária).  
PROC:nnnnn  Nero do processo eleitoral.  
DTPL:aaaammdd  Data do pleito.  
PLEI:nnnnn  Nero do pleito.  
TURN:n  Nero do turno (1 – primeiro turno; 2 – segundo turno).  
FASE:x  Fase dos dados (O – oficial;S – simulado;T – treinamento).  

UNFE:xx  Sigla da UF. No caso de eleição no exterior, a sigla será ZZ.  
MUNI:nnnnn  Nero do município.  
ZONA:nnnn  Nero da zona eleitoral.  
SECA:nnnn  Nero da seção eleitoral.  

AGRE:nnnn.nnnn... Nero das seçs agregadas separadas por ‘.’ 
IDUE:nnnn... Nero de série da urna. 
IDCA:nnnn... Código de identificação da carga (24 dígitos). 
HIQT:n Quantidade de cigos de carga no histico. 
HICA:n:nnnn... Histórico de códigos de carga (sequência de carga:código de identificação de carga). 
VERS:xxxx... Texto de tamanho variável com a versão do software da urna (somente neros e pontos). 
Cabeçalho do boletim de urna – campos exclusivos do Software de Votação (VOTA) e do Recuperador de Dados (RED) 
Campo Descrição 
LOCA:nnnn Nero do local de votação. 
APTO:nnnn Total de eleitores aptos. 
APTS:nnnn Total de eleitores aptos originários da seção. 
APTT:nnnn Total de eleitores aptos transferidos temporariamente para a seção. 
COMP:nnnn Quantidade de eleitores que compareceram para votar. 
FALT:nnnn Quantidade de eleitores faltosos. 
HBBM:nnnn Total de eleitores habilitados biometricamente. HBBG:nnnn Total de eleitores com biometria não reconhecida e habilitados por ano de nascimento. 
HBSB:nnnn Total de eleitores sem biometria, habilitados por ano de nascimento. 
DTAB:aaaammdd Data da abertura da urna. 
HRAB:hhmmss Hora da abertura da urna. 
DTFC:aaaammdd Data do fechamento da urna. 
HRFC:hhmmss Hora do fechamento da urna. 
Cabeçalho do boletim de urna – campos exclusivos do Sistema de Apuração (SA) 
Campo  Descrição  
JUNT:nnnn  Nero da junta apuradora.  
TURM:nnnn  Nero da turma apuradora.  

Cabeçalho do boletim de urna – campos exclusivos do Sistema de Apuração (SA) e do Recuperador de Dados (RED) 

Campo Descrição 
DTEM:aaaammdd Data de emissão do boletim de urna. 
HREM:hhmmss  Hora de emissão do boletim de urna. 
Cabeçalho da eleição 
É incluído para cada eleição. 

Campo Descrição 
IDEL:nnnnn Cigo da eleição. 
MAJO:nnnn Número de votos nos cargos majoritários – campo exclusivo do Sistema de Apuração (SA). 
PROP:nnnn Nero de votos nos cargos proporcionais – campo exclusivo do Sistema de Apuração (SA). 
Cabeçalho do cargo 
É incluído para cada cargo sendo apurado. A partir dele é possível remontar o cargo e o tipo do cargo. 

Campo Descrição 
CARG:nn Cigo do cargo. 
TIPO:n Tipo: 0 – Majoritário; 1 – Proporcional; 2 – Consulta. 
VERC:n Versão do pacote de dados de candidatos/consulta. 
Cabeçalho do partido 
É incluído para cada partido com votação para o cargo. A partir dele é possível remontar a abertura e o fechamento dos votos para o partido. Opcional – sincluído para cargos proporcionais. 
Campo  Descrição  
PART:nn  Nero do partido.  
LEGP:nnnn  Quantidade de votos de legenda para o partido.  
TOTP:nnnn  Total de votos apurados para o partido.  

Votação do candidato ou da resposta 
É incluído para cada candidato ou resposta que recebeu votos. São agrupados pelo cargo 
(majoritário ou consulta) ou pelo partido (proporcional). 

Campo Descrição 
ccccc:nnnn Nero do candidato ou resposta, seguido da quantidade de votos que recebeu. 
Resumo do cargo 
É incluído para cada cargo sendo apurado. A partir dele é possível remontar a abertura e o fechamento dos votos para o cargo. 
Campo  Descrição  
APTA:nnnn  Total de eleitores aptos para votar no cargo.  
APTS:nnnn  Total de eleitores aptos para votar no cargo originários da seção.  
APTT:nnnn  Total de eleitores aptos para votar no cargo transferidos temporariamente para a seção.  

CSEC:nnnn  Quantidade de comparecimento no cargo sem candidatos.  
NOMI:nnnn  Quantidade de votos nominais para o cargo.  
LEGC:nnnn  Quantidade de votos de legenda para o cargo. Opcional – sincluído para cargos proporcionais.  
BRAN:nnnn  Quantidade de votos em branco para o cargo.  
NULO:nnnn  Quantidade de votos nulos para o cargo.  
TOTC:nnnn  Total de votos apurados para o cargo.  



1.4.3. Segurança 
Campo Descrição 
Hash da seção de conteúdo do boletim. Ao final de cada QR Code, virá um hash cumulativo aos dados HASH:xxxxxx... de todos osanteriores, oque permite averificação da leitura emsequência. O cálculo é feito com SHA-512, codificado em hexadecimal. 
Assinatura digital EdDSA ou ECDSA a partir do timo hash (incluído somente no timo QR Code). 
ASSI:xxxxxx... 
Codificado em hexadecimal e também impresso no boletim em papel. 



1.5. Cigo dos cargos 
Para fins de identificação dos cargos, apartir dos seuscódigosencontrados no QR Code do 
boletim de urna, segue abaixo a lista de cargos e seus respectivos cigos. 
Cargo  Cigo  
Presidente  1  
Governador  3  
Senador  5  
Deputado Federal  6  
Deputado Estadual  7  
Deputado Distrital  8  
Prefeito  11  
Vereador  13  
Conselheiro Distrital       25  

1.5.1. Exemplos 
Boletim de urna de eleiçs gerais "pequeno", com os cargos de Deputado Estadual, Deputado Federal, Senador, Governador e Presidente, todos os cargos com diversos candidatos, com comparecimento de 4 eleitores. 
Imagem QR Code 

QRBU:1:2 VRQR:6.0 ORIG:VOTA ORLC:LEG PROC:2000 DTPL:20261004 PLEI:2100 TURN:1 FASE:S UNFE:AC MUNI:1392 ZONA:9 SECA:16 AGRE:17.18.19 IDUE:2250280 IDCA:802779536993017420567657 HIQT:1 HICA:1:802779536993017420567657 VERS:10.17.1.0 LOCA:15 APTO:50 APTS:50 APTT:0 COMP:4 FALT:46 HBBM:3 HBBG:1 HBSB:0 DTAB:20261004 HRAB:171253 DTFC:20261004 HRFC:172431 IDEL:2102 CARG:6 TIPO:1 VERC:202606161209 PART:92 LEGP:1 TOTP:1 PART:95 9501:1 9502:1 LEGP:0 TOTP:2 APTA:50 APTS:50 APTT:0 NOMI:2 LEGC:1 BRAN:1 NULO:0 TOTC:4 CARG:7 TIPO:1 VERC:202606161209 PART:93 93002:1 93003:1 LEGP:1 TOTP:3 APTA:50 APTS:50 APTT:0 NOMI:2 LEGC:1 BRAN:0 NULO:1 TOTC:4 CARG:5 TIPO:0 VERC:202606161209 921:1 931:1 
941:1 951:2 APTA:50 APTS:50 APTT:0 NOMI:5 BRAN:1 NULO:2 TOTC:8 CARG:3 TIPO:0 
VERC:202606161209 92:2 95:1 APTA:50 APTS:50 APTT:0 NOMI:3 BRAN:1 NULO:0 TOTC:4 HASH:8491284FCFDDF33D0464C5F967561F32330BCF87359DF33F78F6B3F6928476EF BFF 5BC6376862887E93B1AE68E602F513FB637D3EBC4D1F0174C8583B264BAD0 


QRBU:2:2 VRQR:6.0 IDEL:2101 CARG:1 TIPO:0 VERC:202606161209 92:1 93:3 APTA:50 
APTS:50 APTT:0 NOMI:4 BRAN:0 NULO:0 TOTC:4 HASH:A90F2993F895C9F384AF030767FC4F4B44AA4537E6BB66CA1783E6E77FD5 DF446 200D56F1899F997FC7729B2996F900BB3BF6C12B5BE6C1E88C269BEB5FE21A0 
ASSI:564DD933E602B15582E2692C2FC8746270380D129E5C0B0896484E30F9CFD65 DA B95C5CDE7D3D0B43546DA012A48FD8BCC069F7116CA967EF793B74DC14A72C91 C00 C760BB0C6556B0C5BA03BA7D348E59AC42F8E77E4F031E21D3430B10EEB0FA6 E8975 F0260ED2A6D936F9F35183D60D021635B743220F01D4CF66183DD71BF6734300 
ASSINATURA QR  CODE: 
564DD933E602B15582E2692C2FC8746270380D129E5C0B0896484E30F9CFD65DAB95C5CDE7D3D0B43546DA0 12A48FD8BCC069F7116CA967EF793B74DC14A72C91C00C760BB0C6556B0C5BA03BA7D348E59AC42F8E77E 4F031E21D34 30B10EEB0FA6E8975F0260ED2A6D936F9F35183D60D021635B743220F01D4CF66183DD71BF6734300 
Boletim de urna "grande", com mais de uma imagem, os cargos para prefeito e vereador, todos os cargos com diversos candidatos, com comparecimento de 504 eleitores e votos em candidatos diferentes para vereadores. Para representar as informaçs contidas na votação desse exemplo 
foram necessárias 4 imagens de QR Codes. 
Imagem QR Code Dados de cada imagem 

QRBU:1:9 VRQR:6.0 ORIG:VOTA ORLC:LEG PROC:2010 DTPL:20261004 PLEI:2100 TURN:1 FASE:S UNFE:AC MUNI:1392 ZONA:9 SECA:33 IDUE:2408911 IDCA:681567226953273484636176 HIQT:1 HICA:1:681567226953273484636176 VERS:10.17.1.0 LOCA:4 APTO:502 APTS:502 APTT:0 COMP:381 FALT:121 DTAB:20261004 HRAB:082145 DTFC:20261004 HRFC:225814 IDEL:2102 CARG:6 TIPO:1 VERC:202607091043 PART:91 9101:1 9102:1 9103:1 9104:1 9106:1 9107:1 9108:1 9109:1 9110:1 9111:1 9112:1 9113:1 9114:1 9115:1 9116:1 9117:1 9118:1 9119:1 9120:1 9121:1 9122:1 9123:1 9124:1 9125:1 9126:1 9127:1 9128:1 9129:1 9130:1 9131:1 9132:1 9133:1 9134:1 9135:1 9136:1 9137:1 9138:1 9139:1 9140:1 9141:1 LEGP:0 TOTP:40 PART:92 9201:1 9202:1 9203:1 9204:1 9206:1 9207:1 9208:1 9209:1 9210:1 9211:1 9212:1 9213:1 9214:1 9215:1 9216:1 9217:1 9218:1 9219:1 9220:1 9221:1 9222:1 9223:1 9224:1 9225:1 HASH:39D3EEEE1D337EC9B49F4B2F24DC306F3CE6906F3E80177E4BC226 FB0F01722D4981CD7387EF2C815A2BFC135395B278FD4528C24CB88E2CD 13A275BF38F02EB QRBU:2:9 VRQR:6.0 9226:1 9227:1 9228:1 9229:1 9230:1 9231:1 9232:1 9233:1 9234:1 9235:1 9236:1 9237:1 9238:1 9239:1 9240:1 9241:1 9242:1 9243:1 9244:1 9245:1 9246:1 9247:1 9248:1 9249:1 9250:1 9251:1 9252:1 9253:1 9254:1 9255:1 9256:1 9257:1 9258:1 9259:1 9260:1 9261:1 9262:1 9263:1 9264:1 9265:1 9266:1 9267:1 9268:1 9269:1 9270:1 9271:1 9272:1 9273:1 9274:1 9275:1 9276:1 9277:1 9278:1 9279:1 9280:1 LEGP:0 TOTP:79 PART:93 9301:1 9302:1 9303:1 9304:1 9305:1 9306:1 9307:1 9308:1 9309:1 9310:1 9311:1 9312:1 9313:1 9314:1 9315:1 9316:1 9317:1 9318:1 9319:1 9320:1 9321:1 9322:1 9323:1 9324:1 9325:1 9326:1 9327:1 9328:1 9329:1 9330:1 9331:1 9332:1 9333:1 9334:1 9335:1 9336:1 9337:1 9338:1 9339:1 9340:1 9341:1 9342:1 9343:1 9344:1 9345:1 9346:1 9347:1 9348:1 9349:1 9350:1 9351:1 9352:1 9353:1 9354:1 9355:1 9356:1 9357:1 9358:1 9359:1 


HASH:5FD766B5DD4FC9E9583F6AE56CA1CC65D29C0B5872DC FC AD732C8 D3D5D305685834535F9B121F91E746B8062932C5A2BC2A9700B84CFB3 AEBA 58555326FA0BE716B04974276843375B46D15CF88300FECD7D96 


QRBU:3:9 VRQR:6.0 9360:1 9361:1 9362:1 9363:1 9364:1 9365:1 9366:1 9367:1 9368:1 9369:1 9370:1 9371:1 9372:1 9373:1 9374:1 9375:1 9376:1 9377:1 9378:1 9379:1 9380:1 LEGP:0 TOTP:80 PART:94 9401:1 9402:1 9403:1 9404:1 9405:1 9406:1 9407:1 9408:1 9409:1 9410:1 9411:1 9412:1 9413:1 9414:1 9415:1 9416:1 9417:1 9418:1 9419:1 9420:1 9421:1 9422:1 9423:1 9424:1 9425:1 9426:1 9427:1 9428:1 9429:1 9430:1 9431:1 9432:1 9433:1 9434:1 9435:1 9436:1 9437:1 9438:1 9439:1 9440:1 9441:1 9442:1 9443:1 9444:1 9445:1 9446:1 9447:1 9448:1 9449:1 9450:1 9451:1 9452:1 9453:1 9454:1 9455:1 9456:1 9457:1 9458:1 9459:1 9460:1 9461:1 9462:1 9463:1 9464:1 9465:1 9466:1 9467:1 9468:1 9469:1 9470:1 9471:1 9472:1 9473:1 9474:1 9475:1 9476:1 9477:1 9478:1 9479:1 9480:1 LEGP:0 TOTP:80 PART:95 9501:1 9502:1 9503:1 9504:1 9505:1 9506:1 9507:1 9508:1 9509:1 
HASH:99E2E4F2D417366D393FEDDBFDAFF01EEBC6432A7FF2150D8BF64 B40CF3112FFCC4BDEF5547CDEA41051A8C5011341D1F26BE2222D0F55 C55F3BDCE9F6508659 


QRBU:4:9 VRQR:6.0 9510:1 9511:1 9512:1 9513:1 9514:1 9515:1 9516:1 9517:1 9518:1 9519:1 9520:1 9521:1 9522:1 9523:1 9524:1 9525:1 9526:1 9527:1 9528:1 9529:1 9530:1 9531:1 9532:1 9533:1 9534:1 9535:1 9536:1 9537:1 9538:1 9539:1 9540:1 9541:1 9542:1 9543:1 9544:1 9545:1 9546:1 9547:1 9548:1 9549:1 9550:1 9551:1 9552:1 9553:1 9554:1 9555:1 9556:1 9557:1 9558:1 9559:1 9560:1 9561:1 9562:1 9563:1 9564:1 9565:1 9566:1 9567:1 9568:1 9569:1 9570:1 9571:1 9572:1 9573:1 9574:1 9575:1 9576:1 9577:1 9578:1 9579:1 9580:1 LEGP:0 TOTP:80 APTA:502 APTS:502 APTT:0 NOMI:359 LEGC:0 BRAN:14 NULO:8 TOTC:381 CARG:7 TIPO:1 VERC:202607091043 PART:91 91001:1 91002:1 91003:1 91004:1 91005: 1 LEGP:0 TOTP:5 PART:92 92002:1 92003:1 92004:1 LEGP:0 TOTP:3 PART:93 93001:1 93002:1 93003:1 93004:1 93005:1 LEGP:0 TOTP:5 PART:94 94001:1 94002:1 94003:1 94004:1 
HASH:5EFB6A68E629B2D3E7927B429BF9F9DCAA19CBE4CDD425D9394263 620C3BB9706BDE7E53AB74D9E522BA83D132407C9EF49E12F342F187220 729571DB4FB7AAF 


QRBU:5:9 VRQR:6.0 94005:1 LEGP:0 TOTP:5 PART:95 95001:1 95002:1 95003:1 95004:1 95005:1 95006:1 95007:1 95008:1 95009:1 95010:1 95011:1 95012:1 95013:1 95014:1 95015:1 95016:1 95017:1 95018:1 95019:1 95020:1 95021:1 95022:1 95023:1 95024:1 95025:1 95026:1 95027:1 95028:1 95029:1 95030:1 95031:1 95032:1 95033:1 95034:1 95035:1 95036:1 95037:1 95038:1 95039:1 95040:1 95041:1 95042:1 95043:1 95044:1 95045:1 95046:1 95047:1 95048:1 95049:1 95050:1 95051:1 95052:1 95053:1 95054:1 95055:1 95056:1 95057:1 95058:1 95059:1 95060:1 95061:1 95062:1 95063:1 95064:1 95065:1 95066:1 95067:1 95068:1 95069:1 95070:1 95071:1 95072:1 95073:1 95074:1 95075:1 95076:1 95077:1 95078:1 95079:1 95080:1 95081:1 95082:1 95083:1 95084:1 95085:1 95086:1 95087:1 95088:1 95089:1 95090:1 95091:1 95092:1 95093:1 95094:1 95095:1 95096:1 95097:1 95098:1 95099:1 
HASH:EB4B73DCBC3595A38A59146E5E5F68BA7A2465271C0219031E6E2D 9070B966587C0FEBC0F32F397C4A8808777582E36A0679DF072DCE19 DBAD614F6A2BF719A7 QRBU:6:9 VRQR:6.0 95100:1 95101:1 95102:1 95103:1 95104:1 95105:1 95106:1 95107:1 95108:1 95109:1 95110:1 95111:1 95112:1 95113:1 95114:1 95115:1 95116:1 95117:1 95118:1 95119:1 95120:1 95121:1 95122:1 95123:1 95124:1 95125:1 95126:1 95127:1 95128:1 95129:1 95130:1 95131:1 95132:1 95133:1 95134:1 95135:1 95136:1 95137:1 95138:1 95139:1 95140:1 95141:1 95142:1 95143:1 95144:1 95145:1 95146:1 95147:1 95148:1 95149:1 95150:1 95151:1 95152:1 95153:1 95154:1 95155:1 95156:1 95157:1 95158:1 95159:1 95160:1 95161:1 95162:1 95163:1 95164:1 95165:1 95166:1 95167:1 95168:1 95169:1 95170:1 95171:1 95172:1 95173:1 95174:1 95175:1 95176:1 95177:1 95178:1 95179:1 95180:1 95181:1 95182:1 95183:1 95184:1 95185:1 95186:1 95187:1 95188:1 95189:1 95190:1 95191:1 95192:1 95193:1 95194:1 95195:1 95196:1 95197:1 95198:1 95199:1 95200:1 95201:1 


HASH:7C81BA9AA123C3DB4A9D5DC05C062DFC921905294967EEAF5733 A07D5994FBD4BF4139D1DD1D0903F622F4C7FC9E1141CF12B169908BD883 C37B279557BF1423 

QRBU:7:9 VRQR:6.0 95202:1 95203:1 95204:1 95205:1 95206:1 95207:1 95208:1 95209:1 95210:1 95211:1 95212:1 95213:1 95214:1 95215:1 95216:1 95217:1 95218:1 95219:1 95220:1 95221:1 95222:1 95223:1 95224:1 95225:1 95226:1 95227:1 95228:1 95229:1 95230:1 95231:1 95232:1 95233:1 95234:1 95235:1 95236:1 95237:1 95238:1 95239:1 95240:1 95241:1 95242:1 95243:1 95244:1 95245:1 95246:1 95247:1 95248:1 95249:1 95250:1 95251:1 95252:1 95253:1 95254:1 95255:1 95256:1 95257:1 95258:1 95259:1 95260:1 95261:1 95262:1 95263:1 95264:1 95265:1 95266:1 95267:1 95268:1 95269:1 95270:1 95271:1 95272:1 95273:1 95274:1 95275:1 95276:1 95277:1 95278:1 95279:1 95280:1 95281:1 95282:1 95283:1 95284:1 95285:1 95286:1 95287:1 95288:1 95289:1 95290:1 95291:1 95292:1 95293:1 95294:1 95295:1 95296:1 95297:1 95298:1 95299:1 95300:1 95301:1 95302:1 95303:1 
HASH:8FB98A0F6903BF2C0D62E630EDB6BD112791864C8FD080004AB73 DFA096A3ACE4B10A71C2D0AAD2075D0BFEB874031612704F6A46 D8BC9C1E64A613676551FA4 

QRBU:8:9 VRQR:6.0 95304:1 95305:1 95306:1 95307:1 95308:1 95309:1 95310:1 95311:1 95312:1 95313:1 95314:1 95315:1 95316:1 95317:1 95318:1 95319:1 95320:1 95321:1 95322:1 95323:1 95324:1 95325:1 95326:1 95327:1 95328:1 95329:1 95330:1 95331:1 95332:1 95333:1 95334:1 95335:1 95336:1 95337:1 95338:1 95339:1 95340:1 95341:1 95342:1 95343:1 95344:1 95345:1 95346:1 95347:1 95348:1 95349:1 95350:1 95351:1 95352:1 95353:1 95354:1 95355:1 95356:1 95357:1 95358:1 LEGP:0 TOTP:358 APTA:502 APTS:502 APTT:0 NOMI:376 LEGC:0 BRAN:5 NULO:0 TOTC:381 CARG:5 TIPO:0 VERC:202607091043 910:1 912:1 913:1 914:1 915:1 916:1 917:1 918:1 919:1 
920:1 921:1 922:1 923:1 924:1 925:1 926:1 927:1 928:1 929:1 930:1 931:1 932:1 
933:1 934:1 935:1 936:1 937:1 938:1 939:1 940:1 942:1 943:1 944:1 945:1 947:1 
948:1 949:1 950:1 951:1 952:1 953:1 954:1 955:1 956:1 957:1 HASH:A1FC70F52C1026BD15A3E67266AF53FDE9293755155637A65D4965 
31B06074D3A32030C2C1FC4557922681330C3110A5BCEDB241C0F205E8 F1 D4010B1F02CA17 

QRBU:9:9 VRQR:6.0 958:1 959:1 APTA:502 APTS:502 APTT:0 NOMI:47 BRAN:538 NULO:177 TOTC:762 CARG:3 TIPO:0 VERC:202607091043 91:76 92:76 93:76 
94:76 95:76 APTA:502 APTS:502 APTT:0 NOMI:380 BRAN:0 NULO:1 TOTC:381 IDEL:2101 CARG:1 TIPO:0 VERC:202607091043 91:76 92:76 93:76 94:76 95:76 APTA:502 APTS:502 APTT:0 NOMI:380 BRAN:1 NULO:0 TOTC:381 
HASH:6E726D37302994BBE521CEF50564B7E8B83BA5EABBB48747FB39A9 4A44044668D2E5A78138C8EA80BBE6683CDF6E07C56E465 FAE58BC4AF808C8327C3A885090 
ASSINATURA: 
DC57D880FDCD988E4E808B33ED1D011FC9B024BBFF7D11E048F510913 F511EF85252E8687E20FB25A1F4374AE5320632EB57F65ED683D53DC3 49D523A26CA3A382009995965109F5674CA29C45CDAD9AA4FC5EDD 010BE99FC120D0AA35C82EA03EBAD9C46D4F101D7D0B04A15B625 995815A61995A26EEB1725AA3C31FAEBF1366774900 




1.6. Assinatura digital 
Para aassinatura do conteúdo do boletim de urnacodificadonoQR Code, foram utilizados os 
hardwares de segurança das urnas eletricas e os algoritmos de chave plica EdDSA4, usando curvas E-52 para as urnas 2020 e superiores, e ECDSA5 com curvas P-521 para urnas 2013 e 2015. 
É importante destacar que o algoritmo de assinatura digital utilizado para os QR Codes com assinatura ECDSA é de domínio público, eessa assinatura pode serverificada comabiblioteca de cigo aberto OpenSSL6,enquantoaassinaturausando EdDSA pode serverificada coma biblioteca fornecida pelo TSE. 
1.6.1. Formação da assinatura 
A assinatura é realizada a partir do hash do timo QR Code impresso, porém, esse timo hash é calculado a partir dos hashes dos demais QR Codes cumulativamente. 
Por exemplo: 
QRBU:1:N VRQR:6.0 [dados1] HASH:hash([dados1]), 
QRBU:2:N VRQR:6.0 [dados2] HASH:hash([conteo1] + [dados2]), sendo conteo1 = [dados1] HASH:hash1 
QRBU:3:N VRQR:6.0 [dados3] HASH:hash([conteo2] + [dados3]), sendo conteo2 = [dados1] HASH:hash1 [dados2] HASH:hash2 ... 
QRBU:N:N VRQR:6.0 [dadosN] HASH:hash([conteo(N-1)] + [dadosN]), sendo conteo(N-1) = [dados1] HASH:hash1 [dados2] HASH:hash2 … [dados(N-1)] HASH:hash(N-1) 
ASSI:assinatura(hashN), sendo hashN = hash([conteo(N-1)] + [dadosN]) 

1.6.2. Formato de representação do certificado 
Ocertificado da urnaé codificado noQR Code utilizando somente hexadecimais (0 a9, A aF). 
Da mesma forma que o QR Code de dados do BU, foi criada uma estrutura simples do tipo chave e valor. Todos os registros estão na mesma linha, com a chave separada do valor pelo caractere de 
dois pontos, e os registros separados por espaço em branco. Cada QR Code do certificado está limitado a 1.100 caracteres na versão impressa. Portanto, para representar o certificado da urna, são necessários dois QR Codes. 
4 Disponível em https://datatracker.ietf.org/doc/html/rfc8032. 5 Disponível em https://datatracker.ietf.org/doc/html/rfc6979. 6 Disponível em https://www.openssl.org/. 
Para a correta leitura do certificado, é importante observar o modelo de urna. Nas urnas antigas, modelos 2013 e2015,ocertificado está codificado diretamente emDER, enquanto nasurnas novas, modelos 2020 e 2022, o certificado está codificado em PEM. 
1.6.2.1. Cabeçalho do certificado da urna 
Campo Descrição 
Marca de início do certificado. 
QRCE:n:x n = índice do QR Code em uma sequência de QR Codes. x = quantidade total de QR Codes. 
IDUE:nnnn... Nero de série da urna. 
MDUE:nnnn Modelo da urna. 
CERT:xxxxxx... Certificado digital da urna eletrônica. 



1.6.3. Instruções para a verificação de assinatura digital e exemplos de 
cigo 
1.6.3.1 Verificação de assinatura do QR Code 
O QR code do BU é assinado digitalmente pelo hardware criptográfico–módulo de segurança da urna eletrica. As urnas modelos UE2013 e UE2015 geram assinaturas ECDSA (P-521), enquanto as urnas UE2020 e UE2022 assinam com EdDSA (E521). 
Para validação da assinatura, é necessária a chave pública, presente no certificado da urna, disponível nosdois últimos QR Codes do BU. Será preciso concatenar ocampoCERT de cada QR Code para obter o certificado. 
A seguir, um exemplo de cigo python para a validação da assinatura digital de um QR Code. A função verificar_assinatura faz a validação da assinatura digital. Para utilizar o script, é necessário instalar as bibliotecas: • asn1tools; 
• 
pyOpenSSL; 

• 
ECPy –é necessário instalar a versão de desenvolvimento, porque não há release do ECPy com a curva Ed521. 


Para facilitar a instalação, crie um arquivo "requirements.txt" com o conteo abaixo: 
asn1tools>=0.167.0 pyOpenSSL>=25.1.0 git+https://github.com/cslashm/ECPy.git@8143d9ac017de0cb7f980bedaf56cefe6b4d9180 
Execute no terminal: pip3 install -r requirements.txt 
22 
Cigo python 
# !/usr/bin/env python3 
import binascii import hashlib import base64 import re import asn1tools from ecpy.curves import Curve from ecpy.ecdsa import ECDSA from ecpy.eddsa import EDDSA from ecpy.keys import ECPublicKey from asn1crypto import x509 as asn1_x509 
# --- DADOS LIDOS DOS QRCODES DO BU urna 2020 --­# Leia os QR codes do BU e insira os campos na variável correspondente 
campo_HASH_do_qrcode_BU = "" campo_ASSI_do_qrcode_bu = "" campo_CERT_do_qrcode1 = "" campo_CERT_do_qrcode2 = "" 
# --- ASN.1 para leitura de SubjectPublicKeyInfo (com bloco DEFINITIONS) 
_SUBJECT_PUBLIC_KEY_INFO_ASN1 = """ SubjectPublicKeyInfo DEFINITIONS ::= BEGIN SubjectPublicKeyInfo ::= SEQUENCE {
     algorithm  AlgorithmIdentifier, 
     subjectPublicKey  BIT STRING } 
AlgorithmIdentifier ::= SEQUENCE {     algorithm  OBJECT IDENTIFIER,
     parameters  ANY OPTIONAL } END """ _SUBJECT_PUBLIC_KEY_INFO_DECODER = asn1tools.compile_string(_SUBJECT_PUBLIC_KEY_INFO_ASN1, codec="der") 
def extrai_chave_publica_der(cert_der): try:
         cert = asn1_x509.Certificate.load(cert_der)          spki_bytes = cert[‘tbs_certificate’][‘subject_public_key_info’].dump()          spki = _SUBJECT_PUBLIC_KEY_INFO_DECODER.decode(‘SubjectPublicKeyInfo’, spki_bytes)         algo = spki[‘algorithm’][‘algorithm’]         pubkey_bytes = spki[‘subjectPublicKey’][0] if algo == "1.2.840.10045.2.1": # ecPublicKey
             curve = Curve.get_curve(‘secp521r1’)              pubkey = ECPublicKey(curve.decode_point(pubkey_bytes)) return pubkey, ECDSA(), algo 
elif algo == "1.3.6.1.4.1.44588.2.1": # Ed521             curve = Curve.get_curve(‘Ed521’)              pubkey = ECPublicKey(curve.decode_point(pubkey_bytes)) return pubkey, EDDSA(hashlib.shake_256, hash_len=132), algo 
else: raise RuntimeError(f"Algoritmo de chave plica não suportado: {algo}") except Exception as e:         print(f"Falha ao extrair chave plica: {e}") 
raise
 def verificar_assinatura(cert_der, assinatura, dados_hash_qr): try:
         pubkey, verifier, _ = extrai_chave_publica_der(cert_der)
         mensagem = hashlib.sha512(dados_hash_qr).digest() if verifier.verify(mensagem, assinatura, pubkey):             print("Assinatura VÁLIDA!") 
return True else:             print("Assinatura INVÁLIDA! (ecpy.verify retornou False)") 
return False except Exception as e:         print(f"Assinatura INVÁLIDA: {e}") 
return False 
def extrai_certificado_der(cert_bytes): 
        asn1_x509.Certificate.load(cert_bytes) 
return cert_bytes 
def extrai_certificado_pem(cert_bytes): 
       cert_ascii = cert_bytes.decode("ascii") pem_body = "".join(re.findall(r"-----BEGIN CERTIFICATE-----(.*)-----END CERTIFICATE-----", cert_ascii, re.DOTALL)).replace("\n", "")        cert_der = base64.b64decode(pem_body)     
       asn1_x509.Certificate.load(cert_der) 
return cert_der 
23 
def extrai_certificado(campo_cert1, campo_cert2):
       cert_bytes = binascii.unhexlify(campo_cert1.strip() + campo_cert2.strip()) try: return extrai_certificado_der(cert_bytes) except Exception: return extrai_certificado_pem(cert_bytes) 
if __name__ == "__main__":
     cert_bytes = extrai_certificado(campo_CERT_do_qrcode1, campo_CERT_do_qrcode2) 
     assinatura_bytes = binascii.unhexlify(campo_ASSI_do_qrcode_bu)     hash_bytes = binascii.unhexlify(campo_HASH_do_qrcode_BU)
    verificar_assinatura(cert_bytes, assinatura_bytes, hash_bytes) 



1.7. Complemento dos dados – nomes dos candidatos, cargos e eleiçs 
Conforme pode ser visto na descrição do boletim de urna impresso, o relatio conta com uma série de nomes: processo eleitoral, pleito, eleiçs, municípios, cargos, partidos e candidatos. 
A inclusão desses nomes no QR Code tornaria necessária a utilização de um número muito maior 
de cigos de barras. Dessa forma, os nomes foram omitidos no QR Code e, em seu lugar, foram usados cigos para referência. 
Ap a conclusão da preparação das urnas, às vésperas da realização do pleito, a Justiça Eleitoral 
publicará na Internet um conjunto de arquivos com os nomes do processo eleitoral, pleito, 
eleiçs, municípios, cargos, partidos e candidatos. A partir dos cigos presentes no QR Code 
será possível obter os respectivos nomes. 
Esse arquivo de complemento dos dados tem o formato JSON. Um exemplo desse arquivo é apresentado a seguir. O arquivo inclui a assinatura digital, que também utiliza EdDSA (o mesmo algoritmo utilizado no QR Code, mas com chaves diferentes). 
Os arquivos serão disponibilizados na Internet e poderão ser baixados a partir do seguinte endereço: http://qrcodenobu.tse.jus.br/json-bu/fase/idProcesso/FpppppUFMMMMM-qbu.js fase – Fase dos dados por extenso, minúsculo (oficial; simulado; treinamento) idProcesso – Nero do processo eleitoral F – Fase dos dados (o – oficial; s – simulado; t – treinamento) ppppp – Nero do pleito, com zeros à esquerda UF – Sigla da UF, minculo MMMMM – Nero do município, com zeros à esquerda 

