---
title: "Fuzzing 입문: 퍼징의 원리와 분야별 대표 Fuzzer"
date: "2026-11-25"
category: "development"
tags: ["Fuzzing", "Security", "Automotive", "CAN"]
excerpt: "퍼징의 개념과 종류, Test Oracle, 분야별 대표 퍼저와 자동차 CAN 퍼징을 정리한다."
example: false
featured: false
draft: false
---

## 들어가며

소프트웨어에는 개발자가 미처 예상하지 못한 버그가 존재할 수 있다. 단순히 기능이 제대로 작동하지 않는 문제도 있지만, 공격자가 이를 악용하면 정보 유출, 서비스 중단, 권한 상승과 같은 보안 사고로 이어질 수도 있다.

그러나 사람이 모든 입력값을 직접 만들어 프로그램을 검사하는 데에는 한계가 있다. 이러한 문제를 해결하기 위해 사용하는 자동화 테스트 기법이 바로 **Fuzzing**이다.

이번 글에서는 다음 내용을 중심으로 Fuzzing을 알아본다.

1. Fuzzing의 개념과 종류
2. Fuzzer의 동작 원리와 핵심 용어
3. 분야별 대표 Fuzzer와 차이점
4. 자동차 분야에서의 Fuzzing
5. Fuzzing 결과의 분석과 재현 과정

## Fuzzing이란?

**Fuzzing**은 프로그램에 비정상적이거나 예상하지 못한 입력을 반복적으로 전달하여 버그와 보안 취약점을 찾는 자동화된 소프트웨어 테스트 기법이다.

Fuzzing을 수행하는 도구를 **Fuzzer**라고 한다. Fuzzer는 입력을 생성하거나 기존 입력을 변형한 뒤 프로그램에 전달하고 실행 결과를 관찰한다.

예를 들어 이미지 파일을 처리하는 프로그램에 다음과 같은 입력을 전달할 수 있다.

- 정상적인 이미지
- 파일 일부가 손상된 이미지
- 비정상적으로 큰 이미지
- 헤더가 제거된 이미지
- 길이 정보가 실제 데이터와 다른 이미지
- 특정 바이트가 무작위로 변경된 이미지

프로그램이 입력을 처리하다가 비정상 종료되거나 메모리 오류를 일으킨다면 Fuzzer는 해당 입력을 저장할 수 있다. 개발자는 저장된 입력을 사용하여 오류를 재현하고 원인을 분석한다.

다만 입력을 생성해 프로그램을 실행하는 것과, 그 결과가 버그인지 판단하는 것은 서로 다른 문제다. 실행 결과가 올바른지 판정하는 장치가 필요하며 이를 **Test Oracle 또는 Bug Oracle**이라고 한다.

## Fuzzing이 필요한 이유

일반적인 소프트웨어 테스트는 개발자가 예상한 상황을 중심으로 작성된다.

```text
올바른 사용자 이름 입력
정상적인 파일 업로드
올바른 형식의 네트워크 요청
```

반면 공격자는 정상적인 사용 방법만 따르지 않는다.

```text
지나치게 긴 문자열 입력
음수나 최댓값 전달
파일 구조 임의 변경
잘못된 패킷 순서 전송
예상하지 못한 데이터 형식 사용
```

사람이 이러한 입력을 모두 직접 작성하는 것은 어렵다. Fuzzer는 수많은 입력을 자동으로 생성하고 반복 실행하기 때문에 사람이 찾기 어려운 예외 상황을 발견하는 데 유용하다.

적절한 Sanitizer, Assertion 또는 Test Oracle을 함께 사용하는 경우 다음과 같은 문제를 발견할 수 있다.

- Buffer Overflow
- Use-After-Free
- Double-Free
- Null Pointer Dereference
- 정의되지 않은 동작
- 처리되지 않은 예외
- Assertion 실패
- 무한 반복 및 Timeout
- 과도한 메모리 사용
- 잘못된 결과 또는 입력값 검증 누락

Buffer Overflow나 Use-After-Free와 같은 메모리 오류는 ASan 등의 Sanitizer로 탐지할 수 있다. 반면 프로그램이 잘못된 입력을 받아들인 뒤 정상 종료한다면 Crash만 감시하는 Fuzzer는 문제를 알아차리지 못할 수 있다.

이러한 의미적 오류를 찾으려면 다음과 같은 Test Oracle이 필요하다.

- 결과가 요구사항을 만족하는지 검사하는 Assertion
- 정상 구현과 결과를 비교하는 Differential Testing
- 출력 형식과 값의 범위를 검사하는 명세 기반 검증
- ECU의 응답, 상태 또는 DTC 변화를 확인하는 Monitor

Fuzzing 연구에서는 특정 실행이 올바름 정책을 위반했는지 판단하는 장치를 Bug Oracle이라고 정의한다. [Fuzzing Survey 논문](https://seclab.bu.edu/papers/manes19-fuzzing-survey.pdf)

특히 파일 Parser, 네트워크 프로토콜, 웹 요청 처리 코드, 압축 라이브러리, 펌웨어, 차량 ECU처럼 외부 입력을 처리하는 프로그램이 중요한 Fuzzing 대상이다.

## Fuzzing의 종류

Fuzzing은 입력을 만드는 방법과 프로그램 내부 정보를 사용하는 정도에 따라 구분할 수 있다.

### 입력 생성 방식에 따른 분류

#### Mutation-based Fuzzing

기존 입력을 조금씩 변형하여 새로운 입력을 만드는 방식이다.

```text
정상 PNG 파일
    ↓
일부 비트 변경
일부 바이트 삭제
데이터 블록 추가
길이 값 변경
    ↓
변형된 PNG 파일
```

실제 입력 형식을 어느 정도 유지할 수 있으므로 이미지, 문서, 압축 파일처럼 구조가 복잡한 데이터를 테스트할 때 효과적이다.

대표적인 변형 방법은 다음과 같다.

- Bit Flip
- Byte 변경
- Byte 삽입 및 삭제
- 정수값 증가 또는 감소
- 데이터 블록 복사
- 서로 다른 입력 결합
- 의미 있는 문자열이나 토큰 삽입

#### Generation-based Fuzzing

입력 형식이나 프로토콜 문법을 바탕으로 데이터를 처음부터 생성하는 방식이다.

예를 들어 HTTP, JSON 또는 특정 네트워크 패킷의 구조를 알고 있다면 문법에 맞는 입력을 생성하면서 각 필드에 비정상적인 값을 넣을 수 있다.

Generation 방식은 유효한 구조를 유지하면서 다양한 조합을 만들 수 있지만, 입력 형식에 관한 사전 지식과 모델링 작업이 필요하다.

### 내부 정보 활용 정도에 따른 분류

| 방식 | 특징 | 장점 | 단점 |
| --- | --- | --- | --- |
| Black-box | 프로그램 내부 정보를 사용하지 않고 결과만 관찰 | 적용이 쉽고 소스 코드가 없어도 가능 | 내부 실행 경로를 직접 확인하기 어려움 |
| Grey-box | Coverage 등 일부 실행 정보를 활용 | 실행 속도와 탐색 효율의 균형이 좋음 | 계측이나 별도 실행 환경이 필요할 수 있음 |
| White-box | 소스 분석과 Symbolic Execution 등을 활용 | 복잡한 조건을 논리적으로 탐색 가능 | 분석 비용과 자원 사용량이 큼 |

AFL++와 libFuzzer는 대표적인 **Coverage-guided Grey-box Fuzzer**다.

## Coverage-guided Fuzzing

### Coverage란?

**Coverage**는 테스트할 때 프로그램 코드가 얼마나 실행되었는지를 나타내는 지표다.

예를 들어 프로그램에 함수가 10개 있고 테스트 과정에서 7개가 실행되었다면 Function Coverage 관점에서는 전체 함수의 70%가 실행된 것이다.

| 종류 | 의미 |
| --- | --- |
| Function Coverage | 전체 함수 중 실행된 함수의 비율 |
| Line Coverage | 전체 코드 줄 중 실행된 코드 줄의 비율 |
| Branch Coverage | `if`, `switch` 등의 분기 결과가 실행된 정도 |
| Edge Coverage | 제어 흐름 그래프에서 기본 블록 사이의 간선 중 실행된 간선의 집합 또는 비율 |

Edge Coverage는 서로 다른 전체 실행 경로의 개수를 세는 것이 아니다. 기본 블록 A에서 B로 이동한 것과 A에서 C로 이동한 것을 서로 다른 Edge로 기록하는 방식이다.

AFL 계열은 Edge Coverage에 각 Edge가 실행된 횟수를 대략적인 구간으로 나눈 Hit-count 정보를 함께 사용한다. [AFL++ 기술 설명](https://aflplus.plus/docs/technical_details/), [AFL++ 논문](https://aflplus.plus/papers/aflpp-woot2020.pdf)

### Coverage를 활용하는 방법

단순히 무작위 데이터를 계속 전달하면 대부분의 입력이 프로그램의 초기 검사 단계에서 거부된다.

예를 들어 다음 코드가 있다고 가정해 보자.

```c
if (data[0] == 'F') {
    if (data[1] == 'U') {
        if (data[2] == 'Z' && data[3] == 'Z') {
            vulnerable_function();
        }
    }
}
```

완전히 무작위인 입력으로 한 번에 `FUZZ`를 생성할 가능성은 높지 않다. Coverage-guided Fuzzer는 다음과 같은 방식으로 조건을 단계적으로 통과한다.

```text
무작위 입력 생성
    ↓
'F' 조건을 통과한 입력 발견
    ↓
새로운 Edge를 실행한 입력 저장
    ↓
저장된 'F' 입력을 다시 변형
    ↓
'FU' 조건 통과
    ↓
'FUZZ'까지 도달
```

새로운 코드 영역에 도달한 입력을 보존하고 다시 변형함으로써 점점 더 깊은 실행 경로를 탐색하는 것이다.

**Coverage가 높다는 것은 많은 코드 영역을 실행해 보았다는 뜻일 뿐, 프로그램에 버그가 없다는 뜻은 아니다.** 같은 코드도 입력값과 프로그램 상태에 따라 서로 다른 문제가 발생할 수 있다.

## Fuzzing의 핵심 용어

### Seed와 Corpus

**Seed**는 Mutation-based Fuzzing을 시작할 때 제공하는 초기 입력이다.

**Corpus**는 Fuzzer가 현재 보유하고 있는 유용한 입력의 집합이다. 초기에는 사용자가 제공한 Seed로 구성되며, 새로운 Coverage를 발견한 입력 등이 추가될 수 있다.

```text
Seed 입력
    ↓
초기 Corpus 구성
    ↓
Mutation 및 실행
    ↓
새로운 Coverage를 발견한 입력 추가
    ↓
Corpus 확장
```

Generation-based Fuzzer는 입력을 문법이나 모델로부터 생성하기 때문에 반드시 Seed Corpus를 필요로 하지는 않는다.

### Harness

**Harness**는 Fuzzer가 만든 입력을 실제 테스트 대상 함수에 전달하는 연결 코드다.

libFuzzer를 C++로 사용할 때는 Fuzzer가 요구하는 C ABI 심벌을 제공하기 위해 `extern "C"`를 사용해야 한다.

```cpp
#include <stddef.h>
#include <stdint.h>

extern "C" int LLVMFuzzerTestOneInput(
    const uint8_t* data,
    size_t size
) {
    target_function(data, size);
    return 0;
}
```

순수 C 코드에서는 `extern "C"`를 사용하지 않는다. 하나의 예제를 C와 C++ 양쪽에서 사용하려면 다음처럼 조건부로 지정할 수 있다.

```c
#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C"
#endif
int LLVMFuzzerTestOneInput(
    const uint8_t* data,
    size_t size
) {
    target_function(data, size);
    return 0;
}
```

LLVM의 인터페이스 헤더도 해당 함수가 C linkage를 사용해야 한다고 명시한다. [LLVM FuzzerInterface](https://github.com/llvm/llvm-project/blob/main/compiler-rt/lib/fuzzer/FuzzerInterface.h)

좋은 Harness는 다음 조건을 만족해야 한다.

- 테스트 대상의 핵심 로직까지 입력을 전달한다.
- 입력 하나를 빠르게 처리한다.
- 불필요한 파일, 네트워크 및 UI 작업을 줄인다.
- 이전 실행 상태가 다음 실행에 영향을 주지 않는다.
- 정상적으로 거부해야 할 입력과 실제 실패를 구분한다.

### Sanitizer

Sanitizer는 프로그램 실행 중 발생하는 메모리 오류나 정의되지 않은 동작을 탐지하기 위해 컴파일 과정에서 검사 코드를 추가하는 도구다.

| Sanitizer | 주요 탐지 대상 |
| --- | --- |
| ASan | Buffer Overflow, Use-After-Free, Double-Free 등 |
| UBSan | 잘못된 Shift, Null·Alignment 오류, Signed Integer Overflow 등 정의되지 않은 동작 |
| MSan | 초기화되지 않은 메모리 사용 |
| TSan | 멀티스레드 Data Race |
| LSan | 메모리 누수 |

기본 `-fsanitize=undefined`에는 Signed Integer Overflow 검사가 포함되지만, Unsigned Integer Overflow는 포함되지 않는다. C와 C++에서 Unsigned Overflow는 정의된 Wraparound 동작이기 때문이다.

Unsigned Overflow와 일부 정수 변환 문제까지 검사하려면 `-fsanitize=unsigned-integer-overflow`, `-fsanitize=integer` 또는 관련 정수 변환 검사 옵션을 별도로 사용해야 한다. [Clang UBSan 공식 문서](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)

또한 UBSan의 많은 검사는 기본적으로 오류를 보고한 뒤 실행을 계속한다. Fuzzer가 해당 입력을 실패로 처리하게 하려면 필요한 검사에 `-fno-sanitize-recover=...`를 사용하거나 Trap 모드 등을 설정해야 한다.

따라서 비정상 종료, Fatal Signal 또는 Fuzzer가 실패로 인식하도록 설정된 Sanitizer 오류가 발생했을 때 재현 입력이 실패 Artifact로 저장된다고 보는 것이 정확하다.

## 분야별 대표 Fuzzer

### C/C++ 분야: AFL++

AFL++는 Coverage Feedback을 이용하는 Grey-box Fuzzer다. 기존 입력을 변형하고, 새로운 Edge나 Hit-count 변화를 만든 입력을 Corpus에 보존한다.

주요 특징은 다음과 같다.

- Mutation과 Coverage Feedback 사용
- 여러 프로세스를 이용한 병렬 Fuzzing 지원
- 다양한 소스 계측 방식과 바이너리 실행 모드 지원
- Corpus 최소화와 Crash 분석 도구 제공
- Persistent Mode와 함수형 Harness 사용 가능

AFL++는 명령행 프로그램이나 파일 Parser 전체를 실행하는 형태로 자주 사용된다. 하지만 이것이 기술적인 제한은 아니다. Persistent Mode에서는 `LLVMFuzzerTestOneInput`과 비슷하게 대상 함수를 반복 호출할 수 있다. [AFL++ 기능 문서](https://aflplus.plus/docs/features/)

### C/C++ In-process 분야: libFuzzer

libFuzzer는 테스트 대상 코드와 Fuzzer 엔진을 하나의 실행 파일로 연결하는 In-process Coverage-guided Fuzzer다.

주요 특징은 다음과 같다.

- 함수와 라이브러리 단위 Harness에 적합
- 프로세스를 매번 다시 시작하지 않고 입력을 반복 처리
- Clang 및 LLVM Sanitizer와 쉽게 결합
- `LLVMFuzzerTestOneInput` 진입점 사용

JSON Parser나 이미지 디코더처럼 입력 데이터를 처리하는 특정 API를 직접 호출할 때 편리하다.

AFL++는 프로그램 전체, libFuzzer는 함수만 테스트한다고 완전히 구분할 수는 없다. AFL++도 Persistent Mode와 함수형 Harness를 지원하므로 두 도구의 차이는 일반적인 사용 방식과 실행 구조의 차이로 이해하는 것이 적절하다.

LLVM 공식 문서에 따르면 libFuzzer의 원 개발자들은 Active Development를 중단하고 Centipede 개발로 이동했다. 중요한 버그 수정은 계속 제공되지만 주요 기능 추가는 기대하기 어렵다고 명시되어 있다. 따라서 새 프로젝트에서는 유지보수 상태와 실행 환경을 함께 고려해야 한다. [LLVM libFuzzer 문서](https://llvm.org/docs/LibFuzzer.html)

### 관리형 언어 분야: Jazzer와 Atheris

**Jazzer**는 Java와 JVM 플랫폼을 대상으로 하는 Coverage-guided In-process Fuzzer다. Java, Kotlin 등 JVM 기반 코드의 Parser, 역직렬화, 문자열 처리 로직 등을 테스트할 수 있다. [Jazzer 공식 저장소](https://github.com/CodeIntelligenceTesting/jazzer)

**Atheris**는 Python 코드와 CPython Native Extension을 대상으로 하는 Coverage-guided Fuzzer다. 처리되지 않은 Python 예외를 실패로 탐지하며, Native Extension에는 Sanitizer를 함께 적용할 수 있다. [Atheris 공식 저장소](https://github.com/google/atheris)

| Fuzzer | 대상 | 적합한 테스트 |
| --- | --- | --- |
| Jazzer | Java 및 JVM 코드 | Java 라이브러리, Parser, 역직렬화 코드 |
| Atheris | Python과 CPython 확장 | Python 함수, 데이터 처리 및 Native Extension |

### 네트워크 프로토콜 분야: boofuzz

**boofuzz**는 네트워크 서비스와 프로토콜을 테스트하기 위한 Python 기반 Fuzzing 프레임워크다.

boofuzz에서는 프로토콜 요청 구조를 정의하고 여러 요청을 Graph로 연결하여 요청 시퀀스를 구성한다. 테스트할 요청의 Fuzzable Field가 변형되며, 선행 요청은 필요한 순서에 따라 먼저 전송된다.

따라서 boofuzz가 요청 순서를 자동으로 무작위 재배열한다고 보기보다는 다음과 같이 이해하는 것이 정확하다.

> 프로토콜 요청 구조와 요청 시퀀스를 정의하고, 각 요청의 필드를 변형한다.

응답 검사나 Crash 판정은 Callback 또는 Monitor를 구성하여 수행한다. ProcessMonitor는 프로세스의 Segmentation Fault 등을 감시할 수 있으며, NetworkMonitor는 통신 내용을 기록할 수 있다. [boofuzz Quickstart](https://boofuzz.readthedocs.io/en/stable/user/quickstart.html), [boofuzz Monitor 문서](https://boofuzz.readthedocs.io/en/stable/user/monitors.html)

### 운영체제 커널 분야: syzkaller

**syzkaller**는 운영체제 커널을 대상으로 하는 비지도 Coverage-guided Fuzzer다.

다양한 시스템 호출과 인수의 조합을 생성하여 커널에 전달하고, Kernel Panic, 메모리 오류, 교착 상태 등을 탐지한다.

주요 특징은 다음과 같다.

- 시스템 호출 조합 생성
- 커널 Coverage 활용
- 가상 머신을 이용한 반복 테스트와 복구
- 커널과 장치 드라이버 테스트에 적합
- 실패를 발생시킨 시스템 호출 순서 저장 및 최소화

syzkaller는 Linux뿐 아니라 여러 운영체제 커널을 지원한다. [syzkaller 공식 저장소](https://github.com/google/syzkaller)

## 자동차 분야의 Fuzzing

### 자동차 Fuzzing의 대상

자동차에는 엔진, 브레이크, 조향 장치, 인포테인먼트 등을 제어하는 여러 ECU가 존재한다. ECU는 CAN, LIN, FlexRay, Automotive Ethernet 등의 차량 네트워크를 통해 통신한다.

자동차 분야의 Fuzzing에서는 차량 네트워크에 비정상적인 메시지나 진단 요청을 전송하고 ECU의 반응을 확인한다.

대표적인 테스트 대상은 다음과 같다.

- CAN 또는 CAN FD 메시지의 ID, DLC 및 데이터
- UDS 진단 서비스와 파라미터
- ECU 펌웨어의 패킷 처리 코드
- 차량 게이트웨이의 메시지 전달 규칙
- Automotive Ethernet과 SOME/IP 서비스
- 인포테인먼트 시스템의 파일 및 네트워크 입력

```text
정상 CAN 메시지
    ↓
ID, 길이 또는 데이터 변형
    ↓
테스트 네트워크에 전송
    ↓
ECU 응답과 상태 관찰
    ↓
이상 반응을 일으킨 메시지와 환경 저장
```

자동차 Fuzzing에서는 일반 프로그램의 Crash뿐만 아니라 다음과 같은 현상도 확인해야 한다.

- ECU의 응답 중단
- ECU Reset 또는 재부팅
- 비정상적인 진단 응답
- DTC 발생
- 메시지 처리 지연
- 통신 단절 또는 Bus-off
- 의도하지 않은 차량 기능 동작

이러한 현상을 자동으로 판정하려면 ECU 상태, 통신 주기, DTC, 응답 시간 등을 확인하는 Test Oracle 또는 Monitor가 필요하다.

### 오픈소스 도구: Caring Caribou

**Caring Caribou**는 자동차 CAN 네트워크의 보안 테스트와 탐색을 위한 오픈소스 도구다.

Caring Caribou의 기능은 여러 모듈로 구분된다.

- `fuzzer`: Random, Brute Force, Nibble Mutation, Replay, Identify
- `uds`: UDS ECU와 서비스 탐색 및 진단 기능
- `uds_fuzz`: UDS SecurityAccess Seed의 무작위성 및 지연 관련 테스트
- `doip`: IP 기반 DoIP 진단 서비스 탐색과 관련 기능

따라서 UDS와 DoIP 탐색은 CAN Fuzzer 모듈 자체의 기능이 아니라 별도의 모듈이다. DoIP 역시 CAN이 아니라 IP 기반 차량 진단 프로토콜이다. [Caring Caribou 공식 저장소](https://github.com/CaringCaribou/caringcaribou)

### 자동차 전용 상용 Fuzzer: ESCRYPT CycurFUZZ

**ESCRYPT CycurFUZZ**는 자동차 네트워크와 ECU를 대상으로 하는 상용 Protocol Fuzzer다.

CycurFUZZ V2.2 배포판 기준으로 CAN, SOME/IP, SOME/IP-SD, DoIP 및 Virtual ECU Fuzzing 지원이 명시되어 있다. 제품 페이지는 지역이나 시점에 따라 일부 프로토콜을 Upcoming으로 표시할 수 있으므로 버전을 구분해서 확인해야 한다. [ETAS CycurFUZZ V2.2 배포 페이지](https://www.etas.com/ja/downloads/software-downloads-overview/escrypt-cycurfuzz-v2-1/)

Caring Caribou가 오픈소스 기반의 CAN 네트워크 탐색과 실습에 적합하다면, CycurFUZZ는 ECU 개발 및 검증 과정에서 체계적인 자동차 프로토콜 Fuzzing을 수행하는 상용 도구에 가깝다.

### cantools와 Python을 이용한 Custom Fuzzer

기존 Fuzzer를 사용하지 않고 Python으로 목적에 맞는 **Custom Fuzzer**를 직접 만들 수도 있다.

이때 사용할 수 있는 대표적인 라이브러리가 `cantools`와 `python-can`이다.

- `cantools`: DBC 파일을 읽고 CAN 메시지와 신호를 인코딩하거나 디코딩
- `python-can`: CAN 인터페이스에 연결하여 메시지 송수신
- Custom Python 코드: 입력 생성, Mutation, 응답 감시, 결과 저장 및 재현

`cantools` 자체는 Fuzzer가 아니다. 하지만 DBC에 정의된 메시지 ID, 신호 위치, 자료형과 값 범위 등을 읽어 구조에 맞는 CAN 메시지를 생성할 수 있다. 실제 메시지 전송은 `python-can` 등을 이용한다. [cantools 공식 문서](https://cantools.readthedocs.io/en/stable/), [python-can Bus API](https://python-can.readthedocs.io/en/stable/bus.html)

```text
DBC 파일 불러오기
    ↓
테스트할 메시지와 신호 선택
    ↓
경곗값·무작위 값 생성
    ↓
cantools로 CAN 데이터 인코딩
    ↓
python-can으로 메시지 전송
    ↓
ECU 응답과 상태 감시
    ↓
이상 반응을 일으킨 입력과 환경 저장
```

DBC 정보를 활용하면 다음과 같은 테스트를 구성할 수 있다.

- 신호의 최솟값과 최댓값 입력
- 정상 범위의 무작위 값 입력
- 0 또는 경곗값 주변의 값 입력
- 특정 신호만 변경하고 나머지는 정상값으로 유지
- 여러 신호의 조합 변경
- 메시지 전송 주기 변경

다만 다음 조건을 고려해야 한다.

- DBC에 신호의 Minimum과 Maximum이 없으면 `cantools`에서는 해당 값이 `None`일 수 있다.
- `encode(..., strict=True)`는 기본적으로 허용 범위를 벗어난 값을 거부한다.
- 범위 밖 값을 시험하려면 목적에 따라 `strict=False`를 사용하거나 인코딩된 Raw Data를 직접 변형해야 한다.
- `strict=False`여도 신호의 비트 길이로 표현할 수 없는 값을 항상 인코딩할 수 있는 것은 아니다.
- DBC 구조에 맞게 인코딩했다고 해서 Rolling Counter, CRC, AUTOSAR E2E 보호 또는 ECU의 상태 의존 조건까지 자동으로 만족하는 것은 아니다.

[cantools Message.encode API](https://cantools.readthedocs.io/en/stable/#cantools.database.can.Message.encode)

DBC 구조를 유지하면서 신호 값을 변경하는 방식과 Raw Data를 직접 변경하는 방식은 다음처럼 구분할 수 있다.

```text
Signal-aware Fuzzing
→ DBC 구조를 바탕으로 신호 값을 변경

Raw Fuzzing
→ CAN Data의 비트와 바이트를 직접 변경
```

Custom Fuzzer는 메시지, 입력 생성 규칙, 전송 순서, ECU 이상 판단 기준을 목적에 맞게 구현할 수 있다는 장점이 있다. 반면 Mutation Scheduling, 결과 기록, ECU 복구, Timeout 처리, 오류 분류와 재현 기능도 직접 구현해야 한다.

### 자동차 Fuzzing 도구 비교

| 도구 | 구분 | 주요 용도 |
| --- | --- | --- |
| Caring Caribou | 오픈소스 자동차 보안 도구 | CAN Fuzzing과 별도 UDS·DoIP 모듈을 이용한 탐색 |
| ESCRYPT CycurFUZZ | 자동차 전용 상용 Fuzzer | 차량 프로토콜과 물리·가상 ECU Fuzzing |
| cantools + python-can | Custom Fuzzer 개발 환경 | DBC 기반 입력 생성과 CAN 송수신 |

실제 차량에서 무작위 메시지를 전송하면 ECU와 차량 기능에 예상하지 못한 영향을 줄 수 있다. 따라서 시뮬레이터, 가상 ECU, 테스트 벤치 또는 HIL 환경에서 먼저 검증하고 허가된 환경에서만 수행해야 한다.

## 분야별 Fuzzer 비교

| 테스트 분야 | 대표 Fuzzer 또는 도구 | 주요 대상 | 특징 |
| --- | --- | --- | --- |
| C/C++ | AFL++ | 소스 기반 Target과 바이너리 | 다양한 실행 모드와 Coverage-guided Mutation |
| C/C++ In-process | libFuzzer | 함수와 라이브러리 Harness | LLVM·Sanitizer 통합, 중요 버그 중심 유지보수 |
| JVM | Jazzer | Java와 JVM 코드 | Coverage-guided In-process Fuzzing |
| Python | Atheris | Python과 CPython 확장 | Python Coverage 및 예외 탐지 |
| 네트워크 | boofuzz | 서버, 프로토콜, 장비 | 요청 구조·시퀀스 정의와 필드 Mutation |
| 운영체제 | syzkaller | 커널과 드라이버 | 시스템 호출 기반 Coverage-guided Fuzzing |
| 자동차 | Caring Caribou, CycurFUZZ | CAN, UDS, ECU | 차량 메시지와 진단 요청 테스트 |
| 자동차 Custom Fuzzer | cantools, python-can | CAN 메시지와 신호 | DBC 기반 입력 생성과 직접 구현 |

어떤 Fuzzer가 항상 가장 우수한 것은 아니다. 대상 언어, 소스 코드 보유 여부, 입력 구조, 필요한 Oracle과 실행 환경에 따라 적절한 도구가 달라진다.

## Coverage-guided Mutation Fuzzer의 전형적인 동작 과정

다음 흐름은 모든 Fuzzer의 공통 과정이 아니라 **Coverage-guided Mutation Fuzzer의 전형적인 동작 방식**이다.

```text
테스트 대상 선정
    ↓
Harness와 Test Oracle 작성
    ↓
Coverage 계측 및 Sanitizer 적용
    ↓
Seed Corpus 준비
    ↓
입력 선택 및 Mutation
    ↓
테스트 대상 실행
    ↓
Coverage와 실패 여부 확인
    ↓
새로운 Coverage → Corpus에 저장
실패로 판정된 실행 → 재현 입력 저장
    ↓
반복
```

Fuzzer는 Corpus에서 입력을 선택하고 비트 변경, 바이트 삽입 및 삭제 등의 Mutation을 수행한다. 변형된 입력이 새로운 Coverage를 만들면 해당 입력을 Corpus에 추가할 수 있다.

비정상 종료, Fatal Signal 또는 Fuzzer가 실패로 인식하도록 설정된 Sanitizer 오류가 발생하면 오류를 재현할 수 있는 입력을 저장한다. 잘못된 결과처럼 Crash가 발생하지 않는 문제는 Assertion, Differential Testing 또는 별도의 Test Oracle을 통해 실패로 판정해야 한다.

Generation-based Fuzzer는 Seed Corpus나 Mutation을 사용하지 않을 수 있다. boofuzz와 CAN Black-box Fuzzer는 코드 Coverage나 Sanitizer 없이 외부 Monitor와 Oracle을 이용할 수 있으며, White-box Fuzzer는 Symbolic Execution과 제약 조건 해결을 활용할 수 있다.

자동차 Custom Fuzzer에서는 ECU 내부 Coverage를 직접 확인하기 어려운 경우가 많다. 이때는 ECU 응답, DTC, Reset, Timeout, 메시지 주기 변화 등 외부에서 관찰할 수 있는 결과를 Oracle로 사용한다.

## 이상 반응 발견 이후의 과정

Fuzzer가 이상 반응을 발견했다고 해서 분석이 끝난 것은 아니다.

```text
이상 반응 발견
    ↓
동일한 환경에서 재현
    ↓
입력 또는 메시지 순서 최소화
    ↓
중복 결과 분류
    ↓
로그와 Stack Trace 분석
    ↓
Root Cause 확인
    ↓
보안 영향도 평가
    ↓
수정 및 회귀 테스트
```

먼저 저장된 입력으로 같은 문제가 반복되는지 확인해야 한다. 이후 문제를 유지하는 범위에서 불필요한 데이터와 메시지를 제거하면 원인 분석이 쉬워진다.

실패 입력이 여러 개 발견되었더라도 모두 서로 다른 버그라는 의미는 아니다. Stack Trace, 오류 위치, ECU 상태와 응답 형태 등을 기준으로 동일한 원인의 결과를 분류해야 한다.

또한 발견된 문제가 단순한 안정성 버그인지 보안 취약점인지 판단해야 한다.

- 공격자가 입력을 제어할 수 있는가?
- 원격에서 오류를 유발할 수 있는가?
- 메모리 읽기나 쓰기가 가능한가?
- 서비스 중단으로 이어지는가?
- 인증 우회나 임의 코드 실행으로 발전할 수 있는가?

수정이 완료되면 기존 재현 입력을 다시 실행하여 문제가 발생하지 않는지 확인한다. 해당 입력을 Corpus나 회귀 테스트에 추가하면 동일한 문제가 다시 발생하는 것도 방지할 수 있다.

## 나의 경험

직접 Fuzzing 과정을 구성해 보면서 가장 어렵다고 느낀 점은 단순히 많은 입력을 보내는 것이 아니라, 그중에서 실제 이상 반응을 찾아내는 것이었다.

Fuzzer가 수많은 입력을 생성하더라도 프로그램이나 ECU가 항상 명확하게 Crash하는 것은 아니다. 응답 시간이 조금 길어지거나 특정 메시지에만 응답하지 않는 등 눈에 잘 띄지 않는 현상도 발생할 수 있다.

특히 ECU의 응답 지연이나 Timeout이 발생했다고 해서 곧바로 버그라고 단정할 수는 없었다. 버스 부하, 전송 주기, ECU 상태 또는 테스트 환경의 문제일 가능성도 있기 때문이다. 따라서 정상 상태의 기준을 먼저 정하고, 어떤 반응을 실패로 판단할 것인지 Oracle을 설계하는 과정이 중요했다.

이상 반응을 발견한 뒤에는 같은 현상을 다시 재현하는 것이 더욱 중요하다는 것을 알게 되었다. 처음에는 문제가 발생했더라도 같은 입력을 다시 보냈을 때 현상이 반복되지 않는 경우가 있었다. 입력값뿐만 아니라 ECU의 초기 상태, 이전 메시지, 전송 순서와 시간 간격 등이 결과에 영향을 줄 수 있기 때문이다.

이상 반응을 정확하게 재현하려면 다음 정보를 함께 기록해야 한다.

- 오류를 발생시킨 입력 데이터
- 입력과 메시지가 전송된 순서
- 메시지 사이의 시간 간격
- 테스트 대상의 초기 상태와 진단 세션
- 오류 발생 전후의 응답, DTC와 로그
- 사용한 프로그램과 테스트 환경
- 복구 또는 Reset 수행 여부

Fuzzing에서는 이상 반응을 한 번 발견하는 것만으로 충분하지 않다. 동일한 조건에서 문제를 반복해서 발생시킬 수 있어야 원인을 분석하고 실제 버그인지 판단할 수 있다.

이번 경험을 통해 Fuzzing에서 중요한 것은 무작위 입력을 많이 생성하는 것뿐만 아니라, 이상 반응을 정확히 감지하고 재현에 필요한 환경과 입력을 함께 기록하는 것이라는 점을 알게 되었다.

## 마무리

Fuzzing은 개발자가 예상하지 못한 입력을 자동으로 생성하고 실행하여 소프트웨어의 버그와 보안 취약점을 찾는 기술이다.

Coverage-guided Mutation Fuzzer의 핵심 흐름은 다음과 같이 정리할 수 있다.

```text
Seed Corpus
  ↓
Mutation
  ↓
Harness를 통해 Target 실행
  ↓
Coverage와 Test Oracle 확인
  ↓
새 Coverage → Corpus 저장
실패 판정 → 재현 입력 저장
  ↓
반복
```

Fuzzing을 효과적으로 수행하려면 입력을 생성하는 Fuzzer뿐만 아니라 좋은 Harness와 적절한 Test Oracle이 필요하다. 발견된 이상 반응을 재현하고 최소화하며 보안 영향도를 분석하는 후속 작업도 중요하다.

자동차 분야에서도 Fuzzing은 ECU, 차량 네트워크 및 진단 기능의 예상하지 못한 동작을 발견하는 데 활용할 수 있다. Caring Caribou와 같은 오픈소스 도구나 CycurFUZZ와 같은 자동차 전용 Fuzzer를 사용할 수 있으며, `cantools`와 `python-can`으로 목적에 맞는 Custom Fuzzer를 직접 구현할 수도 있다.

Fuzzing은 모든 버그를 찾아주는 완벽한 방법은 아니다. 하지만 적절한 Coverage Feedback, Sanitizer, Monitor와 Test Oracle을 결합하면 사람이 직접 작성하기 어려운 수많은 테스트를 자동으로 수행하고 숨겨진 문제를 발견할 수 있다.

