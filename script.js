function matrix(){
            // birinchi matritsa
            let ab2da12 = new Decimal(document.getElementById('a12').value || "0");
            let ab2da11 = new Decimal(document.getElementById('a11').value || "0");
            let ab2da13 = new Decimal(document.getElementById('a13').value || "0");
            let ab2da21 = new Decimal(document.getElementById('a21').value || "0");
            let ab2da22 = new Decimal(document.getElementById('a22').value || "0");
            let ab2da23 = new Decimal(document.getElementById('a23').value || "0");
            let ab2da31 = new Decimal(document.getElementById('a31').value || "0");
            let ab2da32 = new Decimal(document.getElementById('a32').value || "0");
            let ab2da33 = new Decimal(document.getElementById('a33').value || "0");

            // ikkinchi matritsa
            let ab2db11 = new Decimal(document.getElementById('b11').value || "0");
            let ab2db12 = new Decimal(document.getElementById('b12').value || "0");
            let ab2db13 = new Decimal(document.getElementById('b13').value || "0");
            let ab2db21 = new Decimal(document.getElementById('b21').value || "0");
            let ab2db22 = new Decimal(document.getElementById('b22').value || "0");
            let ab2db23 = new Decimal(document.getElementById('b23').value || "0");
            let ab2db31 = new Decimal(document.getElementById('b31').value || "0");
            let ab2db32 = new Decimal(document.getElementById('b32').value || "0");
            let ab2db33 = new Decimal(document.getElementById('b33').value || "0");

            // Matritsalar
            let A = [
                [ab2da11, ab2da12, ab2da13],
                [ab2da21, ab2da22, ab2da23],
                [ab2da31, ab2da32, ab2da33]
            ];

            let B = [
                [ab2db11, ab2db12, ab2db13],
                [ab2db21, ab2db22, ab2db23],
                [ab2db31, ab2db32, ab2db33]
            ];

            // Natija matritsa (Decimal bilan!)
            let C = [
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)]
            ];

    function matritsa() {
            for(let i = 0; i < 3; i++){
                for(let j = 0; j < 3; j++){
                    for(let k = 0; k < 3; k++){
                        C[i][j] = C[i][j].plus(A[i][k].times(B[k][j]));
                    }
                }
            }
        document.getElementById('about').value = C[0][0].toString(25);
        document.getElementById('about2').value = C[0][1].toString(25);
        document.getElementById('about3').value = C[0][2].toString(25);
        document.getElementById('about4').value = C[1][0].toString(25);
        document.getElementById('about5').value = C[1][1].toString(25);
        document.getElementById('about6').value = C[1][2].toString(25);
        document.getElementById('about7').value = C[2][0].toString(25);
        document.getElementById('about8').value = C[2][1].toString(25);
        document.getElementById('about9').value = C[2][2].toString(25);
    }
        matritsa();
        }
        function maksimovmatrix(){
            // U matritsasi
        let a111 = new Decimal(document.getElementById('maksimova111').value || "0");
        let a112 = new Decimal(document.getElementById('maksimova112').value || "0");
        let a113 = new Decimal(document.getElementById('maksimova113').value || "0");
        let a121 = new Decimal(document.getElementById('maksimova121').value || "0");
        let a122 = new Decimal(document.getElementById('maksimova122').value || "0");
        let a123 = new Decimal(document.getElementById('maksimova123').value || "0");
        let a131 = new Decimal(document.getElementById('maksimova131').value || "0");
        let a132 = new Decimal(document.getElementById('maksimova132').value || "0");
        let a133 = new Decimal(document.getElementById('maksimova133').value || "0");

        let U = [
            [a111, a112, a113],
            [a121, a122, a123],
            [a131, a132, a133]
        ];

        // H matritsasi
        let a211 = new Decimal(document.getElementById('maksimova211').value || "0");
        let a212 = new Decimal(document.getElementById('maksimova212').value || "0");
        let a213 = new Decimal(document.getElementById('maksimova213').value || "0");
        let a221 = new Decimal(document.getElementById('maksimova221').value || "0");
        let a222 = new Decimal(document.getElementById('maksimova222').value || "0");
        let a223 = new Decimal(document.getElementById('maksimova223').value || "0");
        let a231 = new Decimal(document.getElementById('maksimova231').value || "0");
        let a232 = new Decimal(document.getElementById('maksimova232').value || "0");
        let a233 = new Decimal(document.getElementById('maksimova233').value || "0");

        let H = [
            [a211, a212, a213],
            [a221, a222, a223],
            [a231, a232, a233]
        ];

        // F matritsasi
        let a311 = new Decimal(document.getElementById('maksimova311').value || "0");
        let a312 = new Decimal(document.getElementById('maksimova312').value || "0");
        let a313 = new Decimal(document.getElementById('maksimova313').value || "0");
        let a321 = new Decimal(document.getElementById('maksimova321').value || "0");
        let a322 = new Decimal(document.getElementById('maksimova322').value || "0");
        let a323 = new Decimal(document.getElementById('maksimova323').value || "0");
        let a331 = new Decimal(document.getElementById('maksimova331').value || "0");
        let a332 = new Decimal(document.getElementById('maksimova332').value || "0");
        let a333 = new Decimal(document.getElementById('maksimova333').value || "0");

        let F = [
            [a311, a312, a313],
            [a321, a322, a323],
            [a331, a332, a333]
        ];

        // B matritsasi
        let b111 = new Decimal(document.getElementById('maksimovb111').value || "0");
        let b112 = new Decimal(document.getElementById('maksimovb112').value || "0");
        let b113 = new Decimal(document.getElementById('maksimovb113').value || "0");
        let b121 = new Decimal(document.getElementById('maksimovb121').value || "0");
        let b122 = new Decimal(document.getElementById('maksimovb122').value || "0");
        let b123 = new Decimal(document.getElementById('maksimovb123').value || "0");
        let b131 = new Decimal(document.getElementById('maksimovb131').value || "0");
        let b132 = new Decimal(document.getElementById('maksimovb132').value || "0");
        let b133 = new Decimal(document.getElementById('maksimovb133').value || "0");

        let b211 = new Decimal(document.getElementById('maksimovb211').value || "0");
        let b212 = new Decimal(document.getElementById('maksimovb212').value || "0");
        let b213 = new Decimal(document.getElementById('maksimovb213').value || "0");
        let b221 = new Decimal(document.getElementById('maksimovb221').value || "0");
        let b222 = new Decimal(document.getElementById('maksimovb222').value || "0");
        let b223 = new Decimal(document.getElementById('maksimovb223').value || "0");
        let b231 = new Decimal(document.getElementById('maksimovb231').value || "0");
        let b232 = new Decimal(document.getElementById('maksimovb232').value || "0");
        let b233 = new Decimal(document.getElementById('maksimovb233').value || "0");

        let b311 = new Decimal(document.getElementById('maksimovb311').value || "0");
        let b312 = new Decimal(document.getElementById('maksimovb312').value || "0");
        let b313 = new Decimal(document.getElementById('maksimovb313').value || "0");
        let b321 = new Decimal(document.getElementById('maksimovb321').value || "0");
        let b322 = new Decimal(document.getElementById('maksimovb322').value || "0");
        let b323 = new Decimal(document.getElementById('maksimovb323').value || "0");
        let b331 = new Decimal(document.getElementById('maksimovb331').value || "0");
        let b332 = new Decimal(document.getElementById('maksimovb332').value || "0");
        let b333 = new Decimal(document.getElementById('maksimovb333').value || "0");

        // B matritsaning mos elementlarini yig'ish
        let Maksimov11 = b111.plus(b211).plus(b311);
        let Maksimov12 = b112.plus(b212).plus(b312);
        let Maksimov13 = b113.plus(b213).plus(b313);

        let Maksimov21 = b121.plus(b221).plus(b321);
        let Maksimov22 = b122.plus(b222).plus(b322);
        let Maksimov23 = b123.plus(b223).plus(b323);

        let Maksimov31 = b131.plus(b231).plus(b331);
        let Maksimov32 = b132.plus(b232).plus(b332);
        let Maksimov33 = b133.plus(b233).plus(b333);

        let Maksimov = [
            [Maksimov11, Maksimov12, Maksimov13],
            [Maksimov21, Maksimov22, Maksimov23],
            [Maksimov31, Maksimov32, Maksimov33]
        ];


        // Bo'sh matritsalar
        let Bir = [
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)]
        ];
        let Ikki = [
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)]
        ];
        let Uch = [
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)]
        ];

        function thematritsa(){ /*U H F*/
            for(let i = 0; i < 3; i++){
                for(let j = 0; j < 3; j++){
                    for(let k = 0; k < 3; k++){
                        Bir[i][j] = Bir[i][j].plus(U[i][k].times(Maksimov[k][j]));
                    }
                }
            }
            document.getElementById('maksimovc111').value = Bir[0][0].toString(25);
            document.getElementById('maksimovc112').value = Bir[0][1].toString(25);
            document.getElementById('maksimovc113').value = Bir[0][2].toString(25);
            document.getElementById('maksimovc121').value = Bir[1][0].toString(25);
            document.getElementById('maksimovc122').value = Bir[1][1].toString(25);
            document.getElementById('maksimovc123').value = Bir[1][2].toString(25);
            document.getElementById('maksimovc131').value = Bir[2][0].toString(25);
            document.getElementById('maksimovc132').value = Bir[2][1].toString(25);
            document.getElementById('maksimovc133').value = Bir[2][2].toString(25);
            for(let i = 0; i < 3; i++){
                for(let j = 0; j < 3; j++){
                    for(let k = 0; k < 3; k++){
                        Ikki[i][j] = Ikki[i][j].plus(H[i][k].times(Maksimov[k][j]));
                    }
                }
            }
            document.getElementById('maksimovc211').value = Ikki[0][0].toString(25);
            document.getElementById('maksimovc212').value = Ikki[0][1].toString(25);
            document.getElementById('maksimovc213').value = Ikki[0][2].toString(25);
            document.getElementById('maksimovc221').value = Ikki[1][0].toString(25);
            document.getElementById('maksimovc222').value = Ikki[1][1].toString(25);
            document.getElementById('maksimovc223').value = Ikki[1][2].toString(25);
            document.getElementById('maksimovc231').value = Ikki[2][0].toString(25);
            document.getElementById('maksimovc232').value = Ikki[2][1].toString(25);
            document.getElementById('maksimovc233').value = Ikki[2][2].toString(25);
            for(let i = 0; i < 3; i++){
                for(let j = 0; j < 3; j++){
                    for(let k = 0; k < 3; k++){
                        Uch[i][j] = Uch[i][j].plus(F[i][k].times(Maksimov[k][j]));
                    }
                }
            }
            document.getElementById('maksimovc311').value = Uch[0][0].toString(25);
            document.getElementById('maksimovc312').value = Uch[0][1].toString(25);
            document.getElementById('maksimovc313').value = Uch[0][2].toString(25);
            document.getElementById('maksimovc321').value = Uch[1][0].toString(25);
            document.getElementById('maksimovc322').value = Uch[1][1].toString(25);
            document.getElementById('maksimovc323').value = Uch[1][2].toString(25);
            document.getElementById('maksimovc331').value = Uch[2][0].toString(25);
            document.getElementById('maksimovc332').value = Uch[2][1].toString(25);
            document.getElementById('maksimovc333').value = Uch[2][2].toString(25);
        }
        thematritsa();    
        }
        function ganimatrix(){
        let a111 = new Decimal(document.getElementById('amaksimova111').value || "0");
        let a112 = new Decimal(document.getElementById('amaksimova112').value || "0");
        let a113 = new Decimal(document.getElementById('amaksimova113').value || "0");
        let a121 = new Decimal(document.getElementById('amaksimova121').value || "0");
        let a122 = new Decimal(document.getElementById('amaksimova122').value || "0");
        let a123 = new Decimal(document.getElementById('amaksimova123').value || "0");
        let a131 = new Decimal(document.getElementById('amaksimova131').value || "0");
        let a132 = new Decimal(document.getElementById('amaksimova132').value || "0");
        let a133 = new Decimal(document.getElementById('amaksimova133').value || "0");

        let U = [
            [a111, a112, a113],
            [a121, a122, a123],
            [a131, a132, a133]
        ];

        // H matritsasi
        let a211 = new Decimal(document.getElementById('amaksimova211').value || "0");
        let a212 = new Decimal(document.getElementById('amaksimova212').value || "0");
        let a213 = new Decimal(document.getElementById('amaksimova213').value || "0");
        let a221 = new Decimal(document.getElementById('amaksimova221').value || "0");
        let a222 = new Decimal(document.getElementById('amaksimova222').value || "0");
        let a223 = new Decimal(document.getElementById('amaksimova223').value || "0");
        let a231 = new Decimal(document.getElementById('amaksimova231').value || "0");
        let a232 = new Decimal(document.getElementById('amaksimova232').value || "0");
        let a233 = new Decimal(document.getElementById('amaksimova233').value || "0");

        let H = [
            [a211, a212, a213],
            [a221, a222, a223],
            [a231, a232, a233]
        ];

        // F matritsasi
        let a311 = new Decimal(document.getElementById('amaksimova311').value || "0");
        let a312 = new Decimal(document.getElementById('amaksimova312').value || "0");
        let a313 = new Decimal(document.getElementById('amaksimova313').value || "0");
        let a321 = new Decimal(document.getElementById('amaksimova321').value || "0");
        let a322 = new Decimal(document.getElementById('amaksimova322').value || "0");
        let a323 = new Decimal(document.getElementById('amaksimova323').value || "0");
        let a331 = new Decimal(document.getElementById('amaksimova331').value || "0");
        let a332 = new Decimal(document.getElementById('amaksimova332').value || "0");
        let a333 = new Decimal(document.getElementById('amaksimova333').value || "0");

        let F = [
            [a311, a312, a313],
            [a321, a322, a323],
            [a331, a332, a333]
        ];

        // B matritsasi
        let b111 = new Decimal(document.getElementById('amaksimovb111').value || "0");
        let b112 = new Decimal(document.getElementById('amaksimovb112').value || "0");
        let b113 = new Decimal(document.getElementById('amaksimovb113').value || "0");
        let b121 = new Decimal(document.getElementById('amaksimovb121').value || "0");
        let b122 = new Decimal(document.getElementById('amaksimovb122').value || "0");
        let b123 = new Decimal(document.getElementById('amaksimovb123').value || "0");
        let b131 = new Decimal(document.getElementById('amaksimovb131').value || "0");
        let b132 = new Decimal(document.getElementById('amaksimovb132').value || "0");
        let b133 = new Decimal(document.getElementById('amaksimovb133').value || "0");

        let b211 = new Decimal(document.getElementById('amaksimovb211').value || "0");
        let b212 = new Decimal(document.getElementById('amaksimovb212').value || "0");
        let b213 = new Decimal(document.getElementById('amaksimovb213').value || "0");
        let b221 = new Decimal(document.getElementById('amaksimovb221').value || "0");
        let b222 = new Decimal(document.getElementById('amaksimovb222').value || "0");
        let b223 = new Decimal(document.getElementById('amaksimovb223').value || "0");
        let b231 = new Decimal(document.getElementById('amaksimovb231').value || "0");
        let b232 = new Decimal(document.getElementById('amaksimovb232').value || "0");
        let b233 = new Decimal(document.getElementById('amaksimovb233').value || "0");

        let b311 = new Decimal(document.getElementById('amaksimovb311').value || "0");
        let b312 = new Decimal(document.getElementById('amaksimovb312').value || "0");
        let b313 = new Decimal(document.getElementById('amaksimovb313').value || "0");
        let b321 = new Decimal(document.getElementById('amaksimovb321').value || "0");
        let b322 = new Decimal(document.getElementById('amaksimovb322').value || "0");
        let b323 = new Decimal(document.getElementById('amaksimovb323').value || "0");
        let b331 = new Decimal(document.getElementById('amaksimovb331').value || "0");
        let b332 = new Decimal(document.getElementById('amaksimovb332').value || "0");
        let b333 = new Decimal(document.getElementById('amaksimovb333').value || "0");
            //vekotorni kiritish
            // Vektorlarni Decimal bilan olish
        let Vektor = new Decimal(document.getElementById('vek1').value || "0");
        let Vektor2 = new Decimal(document.getElementById('vek2').value || "0");
        let Vektor3 = new Decimal(document.getElementById('vek3').value || "0");

        // Birinchi qavatni Vektor bilan ko'paytirish
        let mtb  = Vektor.times(b111);
        let mtb2 = Vektor.times(b112);
        let mtb3 = Vektor.times(b113);
        let mtb4 = Vektor.times(b121);
        let mtb5 = Vektor.times(b122);
        let mtb6 = Vektor.times(b123);
        let mtb7 = Vektor.times(b131);
        let mtb8 = Vektor.times(b132);
        let mtb9 = Vektor.times(b133);

        // Ikkinchi qavatni Vektor2 bilan ko'paytirish
        let mti  = Vektor2.times(b211);
        let mti2 = Vektor2.times(b212);
        let mti3 = Vektor2.times(b213);
        let mti4 = Vektor2.times(b221);
        let mti5 = Vektor2.times(b222);
        let mti6 = Vektor2.times(b223);
        let mti7 = Vektor2.times(b231);
        let mti8 = Vektor2.times(b232);
        let mti9 = Vektor2.times(b233);

        // Uchinchi qavatni Vektor3 bilan ko'paytirish
        let mtu  = Vektor3.times(b311);
        let mtu2 = Vektor3.times(b312);
        let mtu3 = Vektor3.times(b313);
        let mtu4 = Vektor3.times(b321);
        let mtu5 = Vektor3.times(b322);
        let mtu6 = Vektor3.times(b323);
        let mtu7 = Vektor3.times(b331);
        let mtu8 = Vektor3.times(b332);
        let mtu9 = Vektor3.times(b333);

        // B matritsaning mos elementlari yig'indisi
        let Gani11 = mtb.plus(mti).plus(mtu);
        let Gani12 = mtb2.plus(mti2).plus(mtu2);
        let Gani13 = mtb3.plus(mti3).plus(mtu3);

        let Gani21 = mtb4.plus(mti4).plus(mtu4);
        let Gani22 = mtb5.plus(mti5).plus(mtu5);
        let Gani23 = mtb6.plus(mti6).plus(mtu6);

        let Gani31 = mtb7.plus(mti7).plus(mtu7);
        let Gani32 = mtb8.plus(mti8).plus(mtu8);
        let Gani33 = mtb9.plus(mti9).plus(mtu9);

        let Gani = [
            [Gani11, Gani12, Gani13],
            [Gani21, Gani22, Gani23],
            [Gani31, Gani32, Gani33]
            ]
            
        let Bir = [
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)]
        ];
        let Ikki = [
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)]
        ];
        let Uch = [
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)],
            [new Decimal(0), new Decimal(0), new Decimal(0)]
        ];
        function gthematritsa(){ /*U H F*/
            for(let i = 0; i < 3; i++){
                for(let j = 0; j < 3; j++){
                    for(let k = 0; k < 3; k++){
                        Bir[i][j] = Bir[i][j].plus(U[i][k].times(Gani[k][j]));
                    }
                }
            }
            document.getElementById('amaksimovc111').value = Bir[0][0].toString(25);
            document.getElementById('amaksimovc112').value = Bir[0][1].toString(25);
            document.getElementById('amaksimovc113').value = Bir[0][2].toString(25);
            document.getElementById('amaksimovc121').value = Bir[1][0].toString(25);
            document.getElementById('amaksimovc122').value = Bir[1][1].toString(25);
            document.getElementById('amaksimovc123').value = Bir[1][2].toString(25);
            document.getElementById('amaksimovc131').value = Bir[2][0].toString(25);
            document.getElementById('amaksimovc132').value = Bir[2][1].toString(25);
            document.getElementById('amaksimovc133').value = Bir[2][2].toString(25);
            for(let i = 0; i < 3; i++){
                for(let j = 0; j < 3; j++){
                    for(let k = 0; k < 3; k++){
                        Ikki[i][j] = Ikki[i][j].plus(H[i][k].times(Gani[k][j]));
                    }
                }
            }
            document.getElementById('amaksimovc211').value = Ikki[0][0].toString(25);
            document.getElementById('amaksimovc212').value = Ikki[0][1].toString(25);
            document.getElementById('amaksimovc213').value = Ikki[0][2].toString(25);
            document.getElementById('amaksimovc221').value = Ikki[1][0].toString(25);
            document.getElementById('amaksimovc222').value = Ikki[1][1].toString(25);
            document.getElementById('amaksimovc223').value = Ikki[1][2].toString(25);
            document.getElementById('amaksimovc231').value = Ikki[2][0].toString(25);
            document.getElementById('amaksimovc232').value = Ikki[2][1].toString(25);
            document.getElementById('amaksimovc233').value = Ikki[2][2].toString(25);
            for(let i = 0; i < 3; i++){
                for(let j = 0; j < 3; j++){
                    for(let k = 0; k < 3; k++){
                        Uch[i][j] = Uch[i][j].plus(F[i][k].times(Gani[k][j]));
                    }
                }
            }
            document.getElementById('amaksimovc311').value = Uch[0][0].toString(25);
            document.getElementById('amaksimovc312').value = Uch[0][1].toString(25);
            document.getElementById('amaksimovc313').value = Uch[0][2].toString(25);
            document.getElementById('amaksimovc321').value = Uch[1][0].toString(25);
            document.getElementById('amaksimovc322').value = Uch[1][1].toString(25);
            document.getElementById('amaksimovc323').value = Uch[1][2].toString(25);
            document.getElementById('amaksimovc331').value = Uch[2][0].toString(25);
            document.getElementById('amaksimovc332').value = Uch[2][1].toString(25);
            document.getElementById('amaksimovc333').value = Uch[2][2].toString(25);
        }
        gthematritsa();
        }
        function up(){
            let A = [
                [new Decimal(document.getElementById('sa11').value || '0'), new Decimal(document.getElementById('sa12').value || '0'), new Decimal(document.getElementById('sa13').value || '0')],
                [new Decimal(document.getElementById('sa21').value || '0'), new Decimal(document.getElementById('sa22').value || '0'), new Decimal(document.getElementById('sa23').value || '0')],
                [new Decimal(document.getElementById('sa31').value || '0'), new Decimal(document.getElementById('sa32').value || '0'), new Decimal(document.getElementById('sa33').value || '0')]
            ];
            let b = Number(document.getElementById('daraja').value);
            let C2 = [
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)]
            ];

            let C3 = [
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)]
            ];

            let C4 = [
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)]
            ];

            let C5 = [
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)],
                [new Decimal(0), new Decimal(0), new Decimal(0)]
            ];

                for(let i = 0; i < 3; i++){
                    for(let j = 0; j < 3; j++){
                        for(let k = 0; k < 3; k++){
                        C2[i][j] = C2[i][j].plus(A[i][k].times(A[k][j]));
                        }
                    }
                }
                for(let i = 0; i < 3; i++){
                    for(let j = 0; j < 3; j++){
                        for(let k = 0; k < 3; k++){
                        C3[i][j] = C3[i][j].plus(C2[i][k].times(A[k][j]));
                        }
                    }
                }
                for(let i = 0; i < 3; i++){
                    for(let j = 0; j < 3; j++){
                        for(let k = 0; k < 3; k++){
                        C4[i][j] = C4[i][j].plus(C2[i][k].times(C2[k][j]));
                        }
                    }
                }
                for(let i = 0; i < 3; i++){
                    for(let j = 0; j < 3; j++){
                        for(let k = 0; k < 3; k++){
                        C5[i][j] = C5[i][j].plus(C4[i][k].times(A[k][j]));
                        }
                    }
                }
            if(b == 2){
                document.getElementById('ja11').value = C2[0][0].toString(25);
                document.getElementById('ja12').value = C2[0][1].toString(25);
                document.getElementById('ja12').value = C2[0][1].toString(25);
                document.getElementById('ja13').value = C2[0][2].toString(25);
                document.getElementById('ja21').value = C2[1][0].toString(25);
                document.getElementById('ja22').value = C2[1][1].toString(25);
                document.getElementById('ja23').value = C2[1][2].toString(25);
                document.getElementById('ja31').value = C2[2][0].toString(25);
                document.getElementById('ja32').value = C2[2][1].toString(25);
                document.getElementById('ja33').value = C2[2][2].toString(25);
            }
            else if(b == 3){
                document.getElementById('ja11').value = C3[0][0].toString(25);
                document.getElementById('ja12').value = C3[0][1].toString(25);
                document.getElementById('ja13').value = C3[0][2].toString(25);
                document.getElementById('ja21').value = C3[1][0].toString(25);
                document.getElementById('ja22').value = C3[1][1].toString(25);
                document.getElementById('ja23').value = C3[1][2].toString(25);
                document.getElementById('ja31').value = C3[2][0].toString(25);
                document.getElementById('ja32').value = C3[2][1].toString(25);
                document.getElementById('ja33').value = C3[2][2].toString(25);
            }
            else if(b == 4){
                document.getElementById('ja11').value = C4[0][0].toString(25);
                document.getElementById('ja12').value = C4[0][1].toString(25);
                document.getElementById('ja13').value = C4[0][2].toString(25);
                document.getElementById('ja21').value = C4[1][0].toString(25);
                document.getElementById('ja22').value = C4[1][1].toString(25);
                document.getElementById('ja23').value = C4[1][2].toString(25);
                document.getElementById('ja31').value = C4[2][0].toString(25);
                document.getElementById('ja32').value = C4[2][1].toString(25);
                document.getElementById('ja33').value = C4[2][2].toString(25);
            }
            else if(b == 5){
                document.getElementById('ja11').value = C5[0][0].toString(25);
                document.getElementById('ja12').value = C5[0][1].toString(25);
                document.getElementById('ja13').value = C5[0][2].toString(25);
                document.getElementById('ja21').value = C5[1][0].toString(25);
                document.getElementById('ja22').value = C5[1][1].toString(25);
                document.getElementById('ja23').value = C5[1][2].toString(25);
                document.getElementById('ja31').value = C5[2][0].toString(25);
                document.getElementById('ja32').value = C5[2][1].toString(25);
                document.getElementById('ja33').value = C5[2][2].toString(25);
            }
        else {
            alert('Uzr! Hozircha faqat 2-5-darajagacha hisoblaymiz..');
        }

}

